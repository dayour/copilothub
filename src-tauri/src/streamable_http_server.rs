use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::State as AxumState;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

const SERVER_HOST: &str = "127.0.0.1";
const TOOL_CATALOG_JSON: &str = include_str!("../../src/shared/toolCatalog.json");

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpToolDefinition {
    pub id: String,
    pub title: String,
    pub description: String,
    pub capability: String,
    pub session_scope: String,
    pub availability: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub input_schema: Option<HttpToolInputSchema>,
    pub execution: HttpToolExecutionMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpToolInputSchema {
    #[serde(rename = "type")]
    pub schema_type: String,
    pub properties: BTreeMap<String, HttpToolInputPropertySchema>,
    #[serde(default)]
    pub required: Vec<String>,
    pub additional_properties: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpToolInputPropertySchema {
    #[serde(rename = "type")]
    pub property_type: String,
    pub description: Option<String>,
    #[serde(rename = "enum")]
    pub enum_values: Option<Vec<String>>,
    pub items: Option<Box<HttpToolInputPropertySchema>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpToolExecutionMetadata {
    pub transport: String,
    pub json_rpc_method: String,
    pub streamable: bool,
    pub session_binding: String,
    #[serde(default)]
    pub target_selectors: Vec<String>,
    pub default_targeting: Option<String>,
    pub preferred_server_id: Option<String>,
    pub mcp_tool_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpSessionSandboxContext {
    pub execution_target: String,
    pub isolation_level: String,
    pub launch_strategy: String,
    pub summary: String,
    #[serde(default)]
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpSessionContext {
    pub id: String,
    pub name: String,
    pub project_path: String,
    pub shell_type: String,
    pub sandbox_mode: String,
    pub sandbox: HttpSessionSandboxContext,
    #[serde(default)]
    pub env_vars: BTreeMap<String, String>,
    pub browser_session_id: Option<String>,
    #[serde(default)]
    pub mcp_session_ids: Vec<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpThreadContext {
    pub id: String,
    pub title: String,
    pub project_path: String,
    pub session_environment_id: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HttpSessionSnapshot {
    pub sessions: Vec<HttpSessionContext>,
    pub threads: Vec<HttpThreadContext>,
    pub selected_session_id: Option<String>,
    pub selected_thread_id: Option<String>,
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamableHttpServerStatus {
    pub running: bool,
    pub bind_address: Option<String>,
    pub requested_port: Option<u16>,
    pub actual_port: Option<u16>,
    pub localhost_only: bool,
    pub tool_count: usize,
    pub started_at_ms: Option<u64>,
    pub streaming_mode: &'static str,
}

impl StreamableHttpServerStatus {
    fn stopped(tool_count: usize) -> Self {
        Self {
            running: false,
            bind_address: None,
            requested_port: None,
            actual_port: None,
            localhost_only: true,
            tool_count,
            started_at_ms: None,
            streaming_mode: "resolution-preview",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamableHttpSessionSyncResult {
    pub session_count: usize,
    pub thread_count: usize,
    pub selected_session_id: Option<String>,
    pub selected_thread_id: Option<String>,
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Default)]
struct HttpServerSessionCatalog {
    sessions: Vec<HttpSessionContext>,
    threads: Vec<HttpThreadContext>,
    selected_session_id: Option<String>,
    selected_thread_id: Option<String>,
    updated_at_ms: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StreamableMcpRequest {
    method: String,
    params: StreamableMcpCallParams,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StreamableMcpCallParams {
    name: String,
    #[serde(default = "empty_object")]
    arguments: Value,
    target: Option<StreamableToolTarget>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StreamableToolTarget {
    session_id: Option<String>,
    thread_id: Option<String>,
    browser_session_id: Option<String>,
    mcp_session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResolvedSessionTarget {
    session_id: String,
    thread_id: Option<String>,
    project_path: String,
    shell_type: String,
    sandbox_mode: String,
    browser_session_id: Option<String>,
    mcp_session_ids: Vec<String>,
    resolution_source: String,
}

#[derive(Debug)]
struct RunningHttpServer {
    status: StreamableHttpServerStatus,
    shutdown_tx: Option<oneshot::Sender<()>>,
    task: JoinHandle<()>,
}

pub struct StreamableHttpServerState {
    tools: Arc<Vec<HttpToolDefinition>>,
    session_catalog: Arc<Mutex<HttpServerSessionCatalog>>,
    runtime: Option<RunningHttpServer>,
}

impl Default for StreamableHttpServerState {
    fn default() -> Self {
        Self {
            tools: Arc::new(load_tool_catalog().unwrap_or_default()),
            session_catalog: Arc::new(Mutex::new(HttpServerSessionCatalog::default())),
            runtime: None,
        }
    }
}

#[derive(Clone)]
struct HttpServerAppState {
    tools: Arc<Vec<HttpToolDefinition>>,
    status: StreamableHttpServerStatus,
    session_catalog: Arc<Mutex<HttpServerSessionCatalog>>,
}

pub fn load_tool_catalog() -> Result<Vec<HttpToolDefinition>, String> {
    serde_json::from_str(TOOL_CATALOG_JSON).map_err(|error| {
        format!(
            "Failed to deserialize shared tool catalog for streamable HTTP server: {}",
            error
        )
    })
}

fn empty_object() -> Value {
    Value::Object(Default::default())
}

fn now_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}

fn session_catalog_snapshot(
    session_catalog: &Arc<Mutex<HttpServerSessionCatalog>>,
) -> HttpServerSessionCatalog {
    session_catalog
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default()
}

fn build_router(
    tools: Arc<Vec<HttpToolDefinition>>,
    status: StreamableHttpServerStatus,
    session_catalog: Arc<Mutex<HttpServerSessionCatalog>>,
) -> Router {
    let app_state = HttpServerAppState {
        tools,
        status,
        session_catalog,
    };

    Router::new()
        .route("/", get(info_handler))
        .route("/health", get(health_handler))
        .route("/info", get(info_handler))
        .route("/tools", get(tool_list_handler))
        .route("/mcp", post(mcp_boundary_handler))
        .with_state(app_state)
}

async fn health_handler(AxumState(state): AxumState<HttpServerAppState>) -> Json<Value> {
    let catalog = session_catalog_snapshot(&state.session_catalog);

    Json(json!({
        "healthy": true,
        "name": "CopilotHub Streamable HTTP Server",
        "version": env!("CARGO_PKG_VERSION"),
        "localhostOnly": state.status.localhost_only,
        "bindAddress": state.status.bind_address,
        "toolCount": state.status.tool_count,
        "streamingMode": state.status.streaming_mode,
        "sessionCount": catalog.sessions.len(),
        "threadCount": catalog.threads.len(),
    }))
}

async fn info_handler(AxumState(state): AxumState<HttpServerAppState>) -> Json<Value> {
    let catalog = session_catalog_snapshot(&state.session_catalog);

    Json(json!({
        "name": "CopilotHub Streamable HTTP Server",
        "version": env!("CARGO_PKG_VERSION"),
        "transport": "http",
        "bindAddress": state.status.bind_address,
        "localhostOnly": state.status.localhost_only,
        "toolCount": state.status.tool_count,
        "catalogSource": "src/shared/toolCatalog.json",
        "sessionExecution": {
            "implemented": true,
            "mode": "resolution-preview",
            "registeredSessions": catalog.sessions.len(),
            "registeredThreads": catalog.threads.len(),
            "selectedSessionId": catalog.selected_session_id,
            "selectedThreadId": catalog.selected_thread_id,
        },
        "streaming": {
            "implemented": false,
            "mode": state.status.streaming_mode,
            "note": "HTTP boundary keeps execution conservative and localhost-only until an authenticated executor is added."
        },
        "endpoints": {
            "health": "/health",
            "info": "/info",
            "tools": "/tools",
            "mcp": "/mcp"
        }
    }))
}

async fn tool_list_handler(AxumState(state): AxumState<HttpServerAppState>) -> Json<Value> {
    Json(json!({
        "count": state.tools.len(),
        "catalogSource": "src/shared/toolCatalog.json",
        "tools": &*state.tools,
    }))
}

fn tool_matches_reference(tool: &HttpToolDefinition, name: &str) -> bool {
    tool.id == name
        || tool.aliases.iter().any(|alias| alias == name)
        || tool
            .execution
            .mcp_tool_name
            .as_ref()
            .map(|tool_name| tool_name == name)
            .unwrap_or(false)
}

fn find_tool<'a>(tools: &'a [HttpToolDefinition], name: &str) -> Option<&'a HttpToolDefinition> {
    tools.iter().find(|tool| tool_matches_reference(tool, name))
}

fn resolve_session_target(
    catalog: &HttpServerSessionCatalog,
    target: Option<&StreamableToolTarget>,
) -> Result<Option<ResolvedSessionTarget>, String> {
    let mut matches: Vec<ResolvedSessionTarget> = Vec::new();

    let session_by_id = |session_id: &str| catalog.sessions.iter().find(|session| session.id == session_id);
    let thread_by_id = |thread_id: &str| catalog.threads.iter().find(|thread| thread.id == thread_id);
    let thread_for_session = |session_id: &str| {
        catalog
            .threads
            .iter()
            .find(|thread| thread.session_environment_id == session_id)
            .map(|thread| thread.id.clone())
    };

    if let Some(target) = target {
        if let Some(session_id) = target.session_id.as_ref() {
            let session = session_by_id(session_id)
                .ok_or_else(|| format!("Unknown sessionId \"{}\".", session_id))?;
            matches.push(ResolvedSessionTarget {
                session_id: session.id.clone(),
                thread_id: target.thread_id.clone().or_else(|| thread_for_session(&session.id)),
                project_path: session.project_path.clone(),
                shell_type: session.shell_type.clone(),
                sandbox_mode: session.sandbox_mode.clone(),
                browser_session_id: session.browser_session_id.clone(),
                mcp_session_ids: session.mcp_session_ids.clone(),
                resolution_source: "sessionId".to_string(),
            });
        }

        if let Some(thread_id) = target.thread_id.as_ref() {
            let thread = thread_by_id(thread_id)
                .ok_or_else(|| format!("Unknown threadId \"{}\".", thread_id))?;
            let session = session_by_id(&thread.session_environment_id)
                .ok_or_else(|| format!("Thread \"{}\" is not linked to a session.", thread_id))?;
            matches.push(ResolvedSessionTarget {
                session_id: session.id.clone(),
                thread_id: Some(thread.id.clone()),
                project_path: session.project_path.clone(),
                shell_type: session.shell_type.clone(),
                sandbox_mode: session.sandbox_mode.clone(),
                browser_session_id: session.browser_session_id.clone(),
                mcp_session_ids: session.mcp_session_ids.clone(),
                resolution_source: "threadId".to_string(),
            });
        }

        if let Some(browser_session_id) = target.browser_session_id.as_ref() {
            let session = catalog
                .sessions
                .iter()
                .find(|candidate| candidate.browser_session_id.as_ref() == Some(browser_session_id))
                .ok_or_else(|| format!("Unknown browserSessionId \"{}\".", browser_session_id))?;
            matches.push(ResolvedSessionTarget {
                session_id: session.id.clone(),
                thread_id: thread_for_session(&session.id),
                project_path: session.project_path.clone(),
                shell_type: session.shell_type.clone(),
                sandbox_mode: session.sandbox_mode.clone(),
                browser_session_id: session.browser_session_id.clone(),
                mcp_session_ids: session.mcp_session_ids.clone(),
                resolution_source: "browserSessionId".to_string(),
            });
        }

        if let Some(mcp_session_id) = target.mcp_session_id.as_ref() {
            let session = catalog
                .sessions
                .iter()
                .find(|candidate| candidate.mcp_session_ids.iter().any(|id| id == mcp_session_id))
                .ok_or_else(|| format!("Unknown mcpSessionId \"{}\".", mcp_session_id))?;
            matches.push(ResolvedSessionTarget {
                session_id: session.id.clone(),
                thread_id: thread_for_session(&session.id),
                project_path: session.project_path.clone(),
                shell_type: session.shell_type.clone(),
                sandbox_mode: session.sandbox_mode.clone(),
                browser_session_id: session.browser_session_id.clone(),
                mcp_session_ids: session.mcp_session_ids.clone(),
                resolution_source: "mcpSessionId".to_string(),
            });
        }
    }

    if !matches.is_empty() {
        let first_session_id = matches[0].session_id.clone();
        if matches
            .iter()
            .any(|candidate| candidate.session_id != first_session_id)
        {
            return Err("Target identifiers resolve to different CopilotHub sessions.".to_string());
        }

        let resolved = matches[0].clone();
        let thread_id = matches
            .iter()
            .find_map(|candidate| candidate.thread_id.clone())
            .or_else(|| target.and_then(|value| value.thread_id.clone()));

        return Ok(Some(ResolvedSessionTarget {
            thread_id,
            ..resolved
        }));
    }

    let selected_session_id = catalog.selected_session_id.clone().or_else(|| {
        catalog.selected_thread_id.as_ref().and_then(|thread_id| {
            thread_by_id(thread_id).map(|thread| thread.session_environment_id.clone())
        })
    });

    let Some(selected_session_id) = selected_session_id else {
        return Ok(None);
    };

    let Some(session) = session_by_id(&selected_session_id) else {
        return Ok(None);
    };

    let selected_thread_id = catalog
        .selected_thread_id
        .clone()
        .filter(|thread_id| {
            thread_by_id(thread_id)
                .map(|thread| thread.session_environment_id == session.id)
                .unwrap_or(false)
        })
        .or_else(|| thread_for_session(&session.id));

    Ok(Some(ResolvedSessionTarget {
        session_id: session.id.clone(),
        thread_id: selected_thread_id,
        project_path: session.project_path.clone(),
        shell_type: session.shell_type.clone(),
        sandbox_mode: session.sandbox_mode.clone(),
        browser_session_id: session.browser_session_id.clone(),
        mcp_session_ids: session.mcp_session_ids.clone(),
        resolution_source: "selectedSession".to_string(),
    }))
}

fn mcp_error(status: StatusCode, code: &str, message: String) -> (StatusCode, Json<Value>) {
    (
        status,
        Json(json!({
            "isError": true,
            "error": {
                "code": code,
                "message": message,
            }
        })),
    )
}

async fn mcp_boundary_handler(
    AxumState(state): AxumState<HttpServerAppState>,
    Json(payload): Json<StreamableMcpRequest>,
) -> (StatusCode, Json<Value>) {
    if payload.method != "tools/call" {
        return mcp_error(
            StatusCode::BAD_REQUEST,
            "unsupported_method",
            format!("Unsupported MCP method \"{}\".", payload.method),
        );
    }

    if !payload.params.arguments.is_object() {
        return mcp_error(
            StatusCode::BAD_REQUEST,
            "invalid_arguments",
            "Tool arguments must be a JSON object.".to_string(),
        );
    }

    let Some(tool) = find_tool(&state.tools, &payload.params.name) else {
        return mcp_error(
            StatusCode::NOT_FOUND,
            "unknown_tool",
            format!("Unknown tool \"{}\".", payload.params.name),
        );
    };

    let catalog = session_catalog_snapshot(&state.session_catalog);
    let resolved_target = match resolve_session_target(&catalog, payload.params.target.as_ref()) {
        Ok(value) => value,
        Err(error) => {
            return mcp_error(StatusCode::BAD_REQUEST, "invalid_target", error);
        }
    };

    if tool.execution.session_binding == "required" && resolved_target.is_none() {
        return mcp_error(
            StatusCode::BAD_REQUEST,
            "session_target_required",
            format!("Tool \"{}\" requires a CopilotHub session target.", tool.id),
        );
    }

    let response_payload = json!({
        "tool": {
            "requestedName": payload.params.name,
            "resolvedId": tool.id,
            "resolvedName": tool.execution.mcp_tool_name.clone().unwrap_or_else(|| tool.id.clone()),
            "transport": tool.execution.transport,
            "sessionBinding": tool.execution.session_binding,
            "targetSelectors": tool.execution.target_selectors,
            "defaultTargeting": tool.execution.default_targeting,
            "preferredServerId": tool.execution.preferred_server_id,
        },
        "target": resolved_target,
        "execution": {
            "scoped": true,
            "allowed": false,
            "mode": "resolution-preview",
            "reason": "HTTP boundary resolves session scope only and does not execute arbitrary tools without an authenticated in-process executor.",
        },
        "arguments": payload.params.arguments,
    });

    let text = match serde_json::to_string(&response_payload) {
        Ok(value) => value,
        Err(error) => {
            return mcp_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "serialization_failed",
                format!("Failed to serialize response payload: {}", error),
            );
        }
    };

    (
        StatusCode::OK,
        Json(json!({
            "content": [{
                "type": "text",
                "text": text,
            }],
            "isError": false
        })),
    )
}

async fn spawn_http_server(
    requested_port: u16,
    tools: Arc<Vec<HttpToolDefinition>>,
    session_catalog: Arc<Mutex<HttpServerSessionCatalog>>,
) -> Result<RunningHttpServer, String> {
    let listener = TcpListener::bind((SERVER_HOST, requested_port))
        .await
        .map_err(|error| format!("Failed to bind streamable HTTP server to localhost: {}", error))?;
    let local_addr = listener
        .local_addr()
        .map_err(|error| format!("Failed to resolve local streamable HTTP server address: {}", error))?;
    let started_at_ms = now_unix_ms();

    let status = StreamableHttpServerStatus {
        running: true,
        bind_address: Some(local_addr.to_string()),
        requested_port: Some(requested_port),
        actual_port: Some(local_addr.port()),
        localhost_only: true,
        tool_count: tools.len(),
        started_at_ms: Some(started_at_ms),
        streaming_mode: "resolution-preview",
    };

    let router = build_router(tools, status.clone(), session_catalog);
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let task = tokio::spawn(async move {
        let server = axum::serve(listener, router).with_graceful_shutdown(async move {
            let _ = shutdown_rx.await;
        });

        if let Err(error) = server.await {
            eprintln!("streamable HTTP server exited with error: {}", error);
        }
    });

    Ok(RunningHttpServer {
        status,
        shutdown_tx: Some(shutdown_tx),
        task,
    })
}

async fn stop_runtime(runtime: RunningHttpServer) {
    let RunningHttpServer {
        mut shutdown_tx,
        task,
        ..
    } = runtime;

    if let Some(sender) = shutdown_tx.take() {
        let _ = sender.send(());
    }

    let _ = task.await;
}

#[tauri::command]
pub async fn sync_streamable_http_server_session_contexts(
    state: State<'_, Mutex<StreamableHttpServerState>>,
    snapshot: HttpSessionSnapshot,
) -> Result<StreamableHttpSessionSyncResult, String> {
    let session_catalog = {
        let guard = state.lock().map_err(|error| error.to_string())?;
        guard.session_catalog.clone()
    };

    let mut catalog = session_catalog.lock().map_err(|error| error.to_string())?;
    catalog.sessions = snapshot.sessions;
    catalog.threads = snapshot.threads;
    catalog.selected_session_id = snapshot.selected_session_id;
    catalog.selected_thread_id = snapshot.selected_thread_id;
    catalog.updated_at_ms = if snapshot.updated_at_ms == 0 {
        now_unix_ms()
    } else {
        snapshot.updated_at_ms
    };

    Ok(StreamableHttpSessionSyncResult {
        session_count: catalog.sessions.len(),
        thread_count: catalog.threads.len(),
        selected_session_id: catalog.selected_session_id.clone(),
        selected_thread_id: catalog.selected_thread_id.clone(),
        updated_at_ms: catalog.updated_at_ms,
    })
}

#[tauri::command]
pub async fn start_streamable_http_server(
    state: State<'_, Mutex<StreamableHttpServerState>>,
    port: Option<u16>,
) -> Result<StreamableHttpServerStatus, String> {
    let requested_port = port.unwrap_or(0);

    let existing_or_stale = {
        let mut guard = state.lock().map_err(|error| error.to_string())?;
        if let Some(runtime) = guard.runtime.as_ref() {
            if !runtime.task.is_finished() {
                return Ok(runtime.status.clone());
            }
        }

        let tools = guard.tools.clone();
        let session_catalog = guard.session_catalog.clone();
        let stale_runtime = guard.runtime.take();
        (tools, session_catalog, stale_runtime)
    };

    let (tools, session_catalog, stale_runtime) = existing_or_stale;
    if let Some(runtime) = stale_runtime {
        stop_runtime(runtime).await;
    }

    let runtime = spawn_http_server(requested_port, tools, session_catalog).await?;
    let status = runtime.status.clone();

    let mut guard = state.lock().map_err(|error| error.to_string())?;
    guard.runtime = Some(runtime);

    Ok(status)
}

#[tauri::command]
pub async fn stop_streamable_http_server(
    state: State<'_, Mutex<StreamableHttpServerState>>,
) -> Result<StreamableHttpServerStatus, String> {
    let (runtime, tool_count) = {
        let mut guard = state.lock().map_err(|error| error.to_string())?;
        let tool_count = guard.tools.len();
        (guard.runtime.take(), tool_count)
    };

    if let Some(runtime) = runtime {
        stop_runtime(runtime).await;
    }

    Ok(StreamableHttpServerStatus::stopped(tool_count))
}

#[tauri::command]
pub async fn streamable_http_server_status(
    state: State<'_, Mutex<StreamableHttpServerState>>,
) -> Result<StreamableHttpServerStatus, String> {
    let mut stale_runtime = None;
    let snapshot = {
        let mut guard = state.lock().map_err(|error| error.to_string())?;
        let tool_count = guard.tools.len();

        match guard.runtime.as_ref() {
            Some(runtime) if !runtime.task.is_finished() => runtime.status.clone(),
            Some(_) => {
                stale_runtime = guard.runtime.take();
                StreamableHttpServerStatus::stopped(tool_count)
            }
            None => StreamableHttpServerStatus::stopped(tool_count),
        }
    };

    if let Some(runtime) = stale_runtime {
        stop_runtime(runtime).await;
    }

    Ok(snapshot)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::SocketAddr;

    async fn get_json(address: &SocketAddr, path: &str) -> Value {
        let response = reqwest::get(format!("http://{}{}", address, path))
            .await
            .expect("request should succeed");
        response.json::<Value>().await.expect("json response")
    }

    async fn post_json(address: &SocketAddr, path: &str, payload: Value) -> Value {
        let client = reqwest::Client::new();
        let response = client
            .post(format!("http://{}{}", address, path))
            .json(&payload)
            .send()
            .await
            .expect("request should succeed");
        response.json::<Value>().await.expect("json response")
    }

    fn sample_session(
        id: &str,
        name: &str,
        project_path: &str,
        browser_session_id: Option<&str>,
        mcp_session_ids: &[&str],
    ) -> HttpSessionContext {
        HttpSessionContext {
            id: id.to_string(),
            name: name.to_string(),
            project_path: project_path.to_string(),
            shell_type: "powershell".to_string(),
            sandbox_mode: "workspace-write".to_string(),
            sandbox: HttpSessionSandboxContext {
                execution_target: "host".to_string(),
                isolation_level: "workspace-write".to_string(),
                launch_strategy: "host".to_string(),
                summary: "Test sandbox context".to_string(),
                warnings: Vec::new(),
            },
            env_vars: BTreeMap::new(),
            browser_session_id: browser_session_id.map(|value| value.to_string()),
            mcp_session_ids: mcp_session_ids.iter().map(|value| value.to_string()).collect(),
            created_at: 1,
            updated_at: 1,
        }
    }

    fn sample_thread(id: &str, title: &str, project_path: &str, session_id: &str) -> HttpThreadContext {
        HttpThreadContext {
            id: id.to_string(),
            title: title.to_string(),
            project_path: project_path.to_string(),
            session_environment_id: session_id.to_string(),
            created_at: 1,
            updated_at: 1,
        }
    }

    #[test]
    fn loads_shared_tool_catalog() {
        let tools = load_tool_catalog().expect("catalog should deserialize");

        assert!(tools.len() >= 10);
        assert!(tools.iter().any(|tool| tool.id == "browser.navigate"));
        assert!(tools.iter().any(|tool| tool.id == "terminal.run"));
        assert!(tools
            .iter()
            .find(|tool| tool.id == "browser.navigate")
            .is_some_and(|tool| tool.execution.target_selectors.contains(&"sessionId".to_string())));
    }

    #[tokio::test]
    async fn serves_health_info_tools_and_session_status_from_localhost() {
        let tools = Arc::new(load_tool_catalog().expect("catalog should deserialize"));
        let session_catalog = Arc::new(Mutex::new(HttpServerSessionCatalog {
            sessions: vec![sample_session(
                "session-a",
                "Main",
                "E:\\copilothub",
                Some("browser-a"),
                &["mcp-a"],
            )],
            threads: vec![sample_thread("thread-a", "Main", "E:\\copilothub", "session-a")],
            selected_session_id: Some("session-a".to_string()),
            selected_thread_id: Some("thread-a".to_string()),
            updated_at_ms: 1,
        }));
        let runtime = spawn_http_server(0, tools.clone(), session_catalog)
            .await
            .expect("server should start");

        let address = runtime
            .status
            .bind_address
            .as_ref()
            .and_then(|value| value.parse::<SocketAddr>().ok())
            .expect("bound socket address");

        let health = get_json(&address, "/health").await;
        assert_eq!(health["healthy"], Value::Bool(true));
        assert_eq!(health["localhostOnly"], Value::Bool(true));
        assert_eq!(health["sessionCount"], Value::from(1));

        let info = get_json(&address, "/info").await;
        assert_eq!(info["sessionExecution"]["implemented"], Value::Bool(true));
        assert_eq!(info["sessionExecution"]["registeredSessions"], Value::from(1));

        let tools_payload = get_json(&address, "/tools").await;
        assert_eq!(tools_payload["count"], Value::from(tools.len()));
        assert_eq!(tools_payload["tools"][0]["id"], Value::from("browser.navigate"));

        stop_runtime(runtime).await;
    }

    #[tokio::test]
    async fn resolves_session_linked_mcp_targets_without_executing_tools() {
        let tools = Arc::new(load_tool_catalog().expect("catalog should deserialize"));
        let session_catalog = Arc::new(Mutex::new(HttpServerSessionCatalog {
            sessions: vec![
                sample_session("session-a", "Main", "E:\\copilothub", Some("browser-a"), &["mcp-a"]),
                sample_session("session-b", "Bug Bash", "E:\\copilothub\\feature", Some("browser-b"), &["mcp-b"]),
            ],
            threads: vec![
                sample_thread("thread-a", "Main", "E:\\copilothub", "session-a"),
                sample_thread("thread-b", "Bug Bash", "E:\\copilothub\\feature", "session-b"),
            ],
            selected_session_id: Some("session-a".to_string()),
            selected_thread_id: Some("thread-a".to_string()),
            updated_at_ms: 1,
        }));
        let runtime = spawn_http_server(0, tools, session_catalog)
            .await
            .expect("server should start");

        let address = runtime
            .status
            .bind_address
            .as_ref()
            .and_then(|value| value.parse::<SocketAddr>().ok())
            .expect("bound socket address");

        let resolved = post_json(
            &address,
            "/mcp",
            json!({
                "method": "tools/call",
                "params": {
                    "name": "browser_navigate",
                    "arguments": { "url": "https://example.com" },
                    "target": { "threadId": "thread-b" }
                }
            }),
        )
        .await;

        assert_eq!(resolved["isError"], Value::Bool(false));

        let text = resolved["content"][0]["text"]
            .as_str()
            .expect("text payload should be present");
        let parsed: Value = serde_json::from_str(text).expect("payload should be json");
        assert_eq!(parsed["tool"]["resolvedId"], Value::from("browser.navigate"));
        assert_eq!(parsed["target"]["sessionId"], Value::from("session-b"));
        assert_eq!(parsed["target"]["threadId"], Value::from("thread-b"));
        assert_eq!(parsed["target"]["envVars"], Value::Null);
        assert_eq!(parsed["execution"]["allowed"], Value::Bool(false));

        let fallback = post_json(
            &address,
            "/mcp",
            json!({
                "method": "tools/call",
                "params": {
                    "name": "browser_click",
                    "arguments": { "selector": "#submit" }
                }
            }),
        )
        .await;

        let fallback_text = fallback["content"][0]["text"]
            .as_str()
            .expect("text payload should be present");
        let fallback_parsed: Value =
            serde_json::from_str(fallback_text).expect("payload should be json");
        assert_eq!(fallback_parsed["target"]["sessionId"], Value::from("session-a"));
        assert_eq!(
            fallback_parsed["target"]["resolutionSource"],
            Value::from("selectedSession")
        );

        stop_runtime(runtime).await;
    }
}
