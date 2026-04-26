use std::fs;
use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde_json::Value;
use serde::Serialize;
use tauri::State;

#[derive(Clone, Debug, PartialEq)]
pub enum VsCodeServerLifecycle {
    Stopped,
    Starting,
    Running,
    Error(String),
}

impl VsCodeServerLifecycle {
    fn as_str(&self) -> &str {
        match self {
            Self::Stopped => "stopped",
            Self::Starting => "starting",
            Self::Running => "running",
            Self::Error(_) => "error",
        }
    }
}

pub struct VsCodeServerState {
    pid: Option<u32>,
    lifecycle: VsCodeServerLifecycle,
    last_error: Option<String>,
}

impl Default for VsCodeServerState {
    fn default() -> Self {
        Self {
            pid: None,
            lifecycle: VsCodeServerLifecycle::Stopped,
            last_error: None,
        }
    }
}

#[derive(Clone, Debug)]
struct VsCodeServerConfig {
    local_url: String,
    health_url: String,
    command: Option<String>,
    args: Vec<String>,
    startup_timeout_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeServerStatusResponse {
    lifecycle: String,
    tracked_pid: Option<u32>,
    local_url: String,
    health_url: String,
    healthy: bool,
    executable_configured: bool,
    last_error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeExtensionEntryPointsResponse {
    main: Option<String>,
    browser: Option<String>,
}

#[derive(Clone, Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeExtensionContributionSummaryResponse {
    commands: usize,
    languages: usize,
    debuggers: usize,
    views: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeLocalExtensionResponse {
    id: String,
    name: String,
    publisher: Option<String>,
    version: String,
    display_name: Option<String>,
    description: Option<String>,
    path: String,
    manifest_path: String,
    readme_path: Option<String>,
    categories: Vec<String>,
    keywords: Vec<String>,
    extension_kind: Vec<String>,
    activation_events: Vec<String>,
    entry_points: VsCodeExtensionEntryPointsResponse,
    contributes: VsCodeExtensionContributionSummaryResponse,
    warnings: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeExtensionDiscoveryProblemResponse {
    path: String,
    message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeExtensionLoadContractResponse {
    discovery_mode: String,
    manifest_file_name: String,
    execution_stage: String,
    supports_runtime_execution: bool,
    configured_extension_directory: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeExtensionDiscoveryResponse {
    load_contract: VsCodeExtensionLoadContractResponse,
    extension_directory: Option<String>,
    extension_directory_exists: bool,
    extensions: Vec<VsCodeLocalExtensionResponse>,
    invalid_entries: Vec<VsCodeExtensionDiscoveryProblemResponse>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VsCodeExtensionHostStatusResponse {
    readiness: String,
    host_api_available: bool,
    can_execute_extensions: bool,
    execution_stage: String,
    extension_directory: Option<String>,
    extension_directory_exists: bool,
    discovered_extension_count: usize,
    invalid_entry_count: usize,
    local_server_healthy: bool,
    executable_configured: bool,
    summary: String,
    last_error: Option<String>,
    remaining_gaps: Vec<String>,
}

fn is_process_alive(pid: u32) -> bool {
    #[cfg(target_os = "windows")]
    {
        Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid), "/NH"])
            .output()
            .map(|o| {
                let stdout = String::from_utf8_lossy(&o.stdout);
                stdout.contains(&pid.to_string())
            })
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        unsafe { libc::kill(pid as i32, 0) == 0 }
    }
}

fn shutdown_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let graceful = Command::new("taskkill")
            .args(["/PID", &pid.to_string()])
            .output();

        if let Ok(output) = graceful {
            if output.status.success() {
                std::thread::sleep(Duration::from_millis(500));
                if !is_process_alive(pid) {
                    return Ok(());
                }
            }
        }

        let forced = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| format!("Failed to force-kill process {}: {}", pid, e))?;

        if forced.status.success() || !is_process_alive(pid) {
            Ok(())
        } else {
            Err(format!(
                "Force-kill returned non-zero for PID {}: {}",
                pid,
                String::from_utf8_lossy(&forced.stderr)
            ))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("kill")
            .args(["-15", &pid.to_string()])
            .output();

        std::thread::sleep(Duration::from_millis(500));

        if !is_process_alive(pid) {
            return Ok(());
        }

        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();

        if !is_process_alive(pid) {
            Ok(())
        } else {
            Err(format!("Failed to kill process {}", pid))
        }
    }
}

fn read_env(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn is_localhost_host(hostname: &str) -> bool {
    matches!(hostname, "localhost" | "127.0.0.1" | "::1" | "[::1]")
}

fn validate_local_url(url: &str, field_name: &str) -> Result<url::Url, String> {
    let parsed = url::Url::parse(url)
        .map_err(|error| format!("{} must be a valid http(s) URL: {}", field_name, error))?;

    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(format!("{} must use http or https", field_name));
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| format!("{} must include a host", field_name))?;

    if !is_localhost_host(host) {
        return Err(format!(
            "{} must target localhost, 127.0.0.1, or ::1 (received {})",
            field_name, host
        ));
    }

    Ok(parsed)
}

fn parse_args_env(key: &str) -> Result<Vec<String>, String> {
    let Some(raw) = read_env(key) else {
        return Ok(Vec::new());
    };

    if raw.starts_with('[') {
        return serde_json::from_str::<Vec<String>>(&raw)
            .map_err(|error| format!("{} must be a JSON array of strings: {}", key, error));
    }

    Ok(raw.split_whitespace().map(|value| value.to_string()).collect())
}

fn parse_timeout_env(key: &str, default_value: u64) -> Result<u64, String> {
    match read_env(key) {
        Some(raw) => {
            let parsed = raw
                .parse::<u64>()
                .map_err(|error| format!("{} must be an integer: {}", key, error))?;

            if parsed == 0 || parsed > 300_000 {
                return Err(format!("{} must be between 1 and 300000 milliseconds", key));
            }

            Ok(parsed)
        }
        None => Ok(default_value),
    }
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn canonicalize_within(base_path: &Path, candidate: &Path) -> Option<PathBuf> {
    let canonical_base = base_path.canonicalize().ok()?;
    let canonical_candidate = candidate.canonicalize().ok()?;

    canonical_candidate
        .starts_with(&canonical_base)
        .then_some(canonical_candidate)
}

fn read_string(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn read_string_list(value: &Value, key: &str) -> Vec<String> {
    value
        .get(key)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(|text| text.trim().to_string())
                .filter(|text| !text.is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn read_extension_kind(value: &Value) -> Vec<String> {
    match value.get("extensionKind") {
        Some(Value::String(kind)) => vec![kind.trim().to_string()],
        Some(Value::Array(kinds)) => kinds
            .iter()
            .filter_map(Value::as_str)
            .map(|kind| kind.trim().to_string())
            .filter(|kind| !kind.is_empty())
            .collect(),
        _ => Vec::new(),
    }
}

fn count_array_items(parent: &Value, key: &str) -> usize {
    parent
        .get(key)
        .and_then(Value::as_array)
        .map(|items| items.len())
        .unwrap_or_default()
}

fn count_view_contributions(parent: &Value) -> usize {
    parent
        .get("views")
        .and_then(Value::as_object)
        .map(|views| {
            views
                .values()
                .filter_map(Value::as_array)
                .map(|items| items.len())
                .sum()
        })
        .unwrap_or_default()
}

fn resolve_extension_directory(project_path: Option<&str>) -> Result<Option<PathBuf>, String> {
    if let Some(configured) = read_env("COPILOTHUB_VSCODE_EXTENSIONS_DIR") {
        let path = PathBuf::from(configured);
        if path.is_absolute() {
            return Ok(Some(path));
        }

        let project_root = project_path
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                "Relative COPILOTHUB_VSCODE_EXTENSIONS_DIR requires a project path".to_string()
            })?;
        return Ok(Some(PathBuf::from(project_root).join(path)));
    }

    Ok(project_path
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|project_root| PathBuf::from(project_root).join(".copilothub").join("extensions")))
}

fn build_extension_load_contract(
    extension_directory: Option<&Path>,
) -> VsCodeExtensionLoadContractResponse {
    VsCodeExtensionLoadContractResponse {
        discovery_mode: "directory".to_string(),
        manifest_file_name: "package.json".to_string(),
        execution_stage: "metadata-only".to_string(),
        supports_runtime_execution: false,
        configured_extension_directory: extension_directory.map(normalize_path),
    }
}

fn resolve_readme_path(extension_path: &Path, manifest: &Value) -> Option<String> {
    if let Some(readme) = read_string(manifest, "readme") {
        let candidate = extension_path.join(readme);
        if let Some(path) = canonicalize_within(extension_path, &candidate).filter(|path| path.is_file()) {
            return Some(normalize_path(&path));
        }
    }

    ["README.md", "README.txt", "readme.md", "readme.txt"]
        .iter()
        .map(|filename| extension_path.join(filename))
        .filter_map(|candidate| canonicalize_within(extension_path, &candidate))
        .find(|candidate| candidate.is_file())
        .map(|path| normalize_path(&path))
}

fn parse_extension_manifest(extension_path: &Path) -> Result<VsCodeLocalExtensionResponse, String> {
    let manifest_path = extension_path.join("package.json");
    if !manifest_path.is_file() {
        return Err("package.json is missing".to_string());
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|error| format!("Failed to read package.json: {}", error))?;
    let manifest: Value = serde_json::from_str(&manifest_content)
        .map_err(|error| format!("package.json is not valid JSON: {}", error))?;

    let name = read_string(&manifest, "name")
        .ok_or_else(|| "package.json is missing the required name field".to_string())?;
    let version = read_string(&manifest, "version")
        .ok_or_else(|| "package.json is missing the required version field".to_string())?;
    let publisher = read_string(&manifest, "publisher");
    let entry_points = VsCodeExtensionEntryPointsResponse {
        main: read_string(&manifest, "main"),
        browser: read_string(&manifest, "browser"),
    };

    let mut warnings = Vec::new();
    if publisher.is_none() {
        warnings.push("Manifest is missing publisher; falling back to the extension name for identity.".to_string());
    }
    if entry_points.main.is_none() && entry_points.browser.is_none() {
        warnings.push(
            "Manifest does not declare main or browser entry points; CopilotHub will only surface metadata.".to_string(),
        );
    }

    let activation_events = read_string_list(&manifest, "activationEvents");
    if activation_events.is_empty() {
        warnings.push("Manifest does not declare activationEvents.".to_string());
    }

    let contributes = manifest.get("contributes").unwrap_or(&Value::Null);

    Ok(VsCodeLocalExtensionResponse {
        id: publisher
            .as_ref()
            .map(|value| format!("{}.{}", value, name))
            .unwrap_or_else(|| name.clone()),
        name,
        publisher,
        version,
        display_name: read_string(&manifest, "displayName"),
        description: read_string(&manifest, "description"),
        path: normalize_path(extension_path),
        manifest_path: normalize_path(&manifest_path),
        readme_path: resolve_readme_path(extension_path, &manifest),
        categories: read_string_list(&manifest, "categories"),
        keywords: read_string_list(&manifest, "keywords"),
        extension_kind: read_extension_kind(&manifest),
        activation_events,
        entry_points,
        contributes: VsCodeExtensionContributionSummaryResponse {
            commands: count_array_items(contributes, "commands"),
            languages: count_array_items(contributes, "languages"),
            debuggers: count_array_items(contributes, "debuggers"),
            views: count_view_contributions(contributes),
        },
        warnings,
    })
}

fn discover_extensions_from_directory(
    extension_directory: Option<&Path>,
) -> Result<VsCodeExtensionDiscoveryResponse, String> {
    let Some(extension_directory) = extension_directory else {
        return Ok(VsCodeExtensionDiscoveryResponse {
            load_contract: build_extension_load_contract(None),
            extension_directory: None,
            extension_directory_exists: false,
            extensions: Vec::new(),
            invalid_entries: Vec::new(),
        });
    };

    let load_contract = build_extension_load_contract(Some(extension_directory));
    if !extension_directory.exists() {
        return Ok(VsCodeExtensionDiscoveryResponse {
            load_contract,
            extension_directory: Some(normalize_path(extension_directory)),
            extension_directory_exists: false,
            extensions: Vec::new(),
            invalid_entries: Vec::new(),
        });
    }

    if !extension_directory.is_dir() {
        return Ok(VsCodeExtensionDiscoveryResponse {
            load_contract,
            extension_directory: Some(normalize_path(extension_directory)),
            extension_directory_exists: false,
            extensions: Vec::new(),
            invalid_entries: vec![VsCodeExtensionDiscoveryProblemResponse {
                path: normalize_path(extension_directory),
                message: "Configured extension path exists but is not a directory".to_string(),
            }],
        });
    }

    let mut candidate_paths = Vec::new();
    let mut invalid_entries = Vec::new();
    if extension_directory.join("package.json").is_file() {
        candidate_paths.push(extension_directory.to_path_buf());
    } else {
        let mut entries = fs::read_dir(extension_directory)
            .map_err(|error| format!("Failed to read extension directory: {}", error))?
            .filter_map(Result::ok)
            .filter_map(|entry| {
                let path = entry.path();
                let file_type = entry.file_type().ok()?;

                if file_type.is_symlink() {
                    invalid_entries.push(VsCodeExtensionDiscoveryProblemResponse {
                        path: normalize_path(&path),
                        message: "Symlinked extension directories are not supported".to_string(),
                    });
                    return None;
                }

                file_type.is_dir().then_some(path)
            })
            .collect::<Vec<_>>();
        entries.sort();
        candidate_paths.extend(entries);
    }

    let mut extensions = Vec::new();

    for candidate in candidate_paths {
        match parse_extension_manifest(&candidate) {
            Ok(extension) => extensions.push(extension),
            Err(message) => invalid_entries.push(VsCodeExtensionDiscoveryProblemResponse {
                path: normalize_path(&candidate),
                message,
            }),
        }
    }

    extensions.sort_by(|left, right| left.id.cmp(&right.id));
    invalid_entries.sort_by(|left, right| left.path.cmp(&right.path));

    Ok(VsCodeExtensionDiscoveryResponse {
        load_contract,
        extension_directory: Some(normalize_path(extension_directory)),
        extension_directory_exists: true,
        extensions,
        invalid_entries,
    })
}

fn remaining_extension_host_gaps() -> Vec<String> {
    vec![
        "CopilotHub does not yet launch or attach a dedicated VS Code extension host runtime.".to_string(),
        "Discovered manifests are not yet injected into the local VS Code server launch path.".to_string(),
        "VSIX installation, enable or disable state, and runtime lifecycle management are still pending.".to_string(),
    ]
}

fn summarize_extension_host_status(
    discovery: &VsCodeExtensionDiscoveryResponse,
    local_server_healthy: bool,
) -> String {
    match (
        discovery.extension_directory.as_ref(),
        discovery.extension_directory_exists,
        discovery.extensions.len(),
        local_server_healthy,
    ) {
        (None, _, _, _) => {
            "Select a local project to resolve the .copilothub/extensions bridge directory.".to_string()
        }
        (Some(path), false, _, _) => format!(
            "No local extension directory was found at {}. Create it to stage unpacked VS Code extensions.",
            path
        ),
        (Some(_), true, 0, _) => {
            "Extension directory found, but no unpacked extension manifests were discovered yet.".to_string()
        }
        (Some(_), true, count, true) => format!(
            "Discovered {} local extension manifest{} while the local VS Code host is reachable. Runtime execution remains staged.",
            count,
            if count == 1 { "" } else { "s" }
        ),
        (Some(_), true, count, false) => format!(
            "Discovered {} local extension manifest{} while the local VS Code host is offline. Metadata discovery is ready.",
            count,
            if count == 1 { "" } else { "s" }
        ),
    }
}

fn compute_extension_host_readiness(
    discovery: &VsCodeExtensionDiscoveryResponse,
    local_server_healthy: bool,
) -> String {
    if discovery.extension_directory.is_none() || !discovery.extension_directory_exists {
        return "unavailable".to_string();
    }

    if local_server_healthy {
        return "host-ready".to_string();
    }

    "discovery-ready".to_string()
}

fn resolve_vscode_server_config() -> Result<VsCodeServerConfig, String> {
    let local_url = read_env("COPILOTHUB_VSCODE_SERVER_URL")
        .unwrap_or_else(|| "http://127.0.0.1:8080".to_string());
    let health_url = read_env("COPILOTHUB_VSCODE_SERVER_HEALTH_URL")
        .unwrap_or_else(|| "http://127.0.0.1:8080/healthz".to_string());

    validate_local_url(&local_url, "COPILOTHUB_VSCODE_SERVER_URL")?;
    validate_local_url(&health_url, "COPILOTHUB_VSCODE_SERVER_HEALTH_URL")?;

    Ok(VsCodeServerConfig {
        local_url,
        health_url,
        command: read_env("COPILOTHUB_VSCODE_SERVER_COMMAND"),
        args: parse_args_env("COPILOTHUB_VSCODE_SERVER_ARGS")?,
        startup_timeout_ms: parse_timeout_env("COPILOTHUB_VSCODE_SERVER_STARTUP_TIMEOUT_MS", 15_000)?,
    })
}

fn resolve_socket_address(url: &str) -> Result<SocketAddr, String> {
    let parsed = url::Url::parse(url).map_err(|error| error.to_string())?;
    let host = parsed
        .host_str()
        .ok_or_else(|| "URL host is missing".to_string())?;
    let port = parsed
        .port_or_known_default()
        .ok_or_else(|| "URL port is missing and no default is available".to_string())?;

    (host, port)
        .to_socket_addrs()
        .map_err(|error| format!("Failed to resolve {}:{} - {}", host, port, error))?
        .next()
        .ok_or_else(|| format!("No socket addresses resolved for {}:{}", host, port))
}

fn endpoint_is_reachable(url: &str, timeout: Duration) -> bool {
    resolve_socket_address(url)
        .ok()
        .and_then(|addr| TcpStream::connect_timeout(&addr, timeout).ok())
        .is_some()
}

fn wait_for_endpoint(url: &str, timeout: Duration) -> bool {
    let start = Instant::now();

    while start.elapsed() < timeout {
        if endpoint_is_reachable(url, Duration::from_millis(400)) {
            return true;
        }

        std::thread::sleep(Duration::from_millis(250));
    }

    false
}

fn build_status_response(
    state: &VsCodeServerState,
    config: &VsCodeServerConfig,
    healthy: bool,
) -> VsCodeServerStatusResponse {
    VsCodeServerStatusResponse {
        lifecycle: state.lifecycle.as_str().to_string(),
        tracked_pid: state.pid,
        local_url: config.local_url.clone(),
        health_url: config.health_url.clone(),
        healthy,
        executable_configured: config.command.is_some(),
        last_error: state.last_error.clone(),
    }
}

fn refresh_status_state(state: &mut VsCodeServerState, config: &VsCodeServerConfig) -> bool {
    let healthy = endpoint_is_reachable(&config.health_url, Duration::from_millis(400));

    if healthy {
        state.lifecycle = VsCodeServerLifecycle::Running;
        state.last_error = None;
        if let Some(pid) = state.pid {
            if !is_process_alive(pid) {
                state.pid = None;
            }
        }
        return true;
    }

    if let Some(pid) = state.pid {
        if !is_process_alive(pid) {
            state.pid = None;
            if matches!(state.lifecycle, VsCodeServerLifecycle::Starting) {
                state.lifecycle = VsCodeServerLifecycle::Error(
                    "Local VS Code server process exited before opening its port".to_string(),
                );
                state.last_error = Some(format!("Tracked process {} exited unexpectedly", pid));
            } else if matches!(state.lifecycle, VsCodeServerLifecycle::Running) {
                state.lifecycle = VsCodeServerLifecycle::Stopped;
            }
        }
    } else if matches!(state.lifecycle, VsCodeServerLifecycle::Running) {
        state.lifecycle = VsCodeServerLifecycle::Stopped;
    }

    healthy
}

fn build_spawn_command(
    executable: &str,
    args: &[String],
    project_path: Option<&str>,
) -> Command {
    #[cfg(target_os = "windows")]
    let mut command = {
        let lowered = executable.to_ascii_lowercase();
        let mut command = if lowered.ends_with(".cmd") || lowered.ends_with(".bat") {
            let mut inner = Command::new("cmd");
            inner.arg("/C").arg(executable);
            inner
        } else {
            Command::new(executable)
        };

        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
        command
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(executable);

    command.args(args);

    if let Some(path) = project_path {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            command.current_dir(trimmed);
        }
    }

    command
}

#[tauri::command]
pub async fn vscode_server_start(
    state: State<'_, Mutex<VsCodeServerState>>,
    project_path: Option<String>,
) -> Result<VsCodeServerStatusResponse, String> {
    let config = resolve_vscode_server_config()?;
    let mut state = state.lock().map_err(|error| error.to_string())?;

    if refresh_status_state(&mut state, &config) {
        return Ok(build_status_response(&state, &config, true));
    }

    if matches!(state.lifecycle, VsCodeServerLifecycle::Starting) {
        return Err("Local VS Code server is already starting".to_string());
    }

    let executable = config.command.clone().ok_or_else(|| {
        "Local VS Code server command is not configured. Set COPILOTHUB_VSCODE_SERVER_COMMAND to a code-server or VS Code Web launcher."
            .to_string()
    })?;

    state.lifecycle = VsCodeServerLifecycle::Starting;
    state.last_error = None;

    let mut command = build_spawn_command(&executable, &config.args, project_path.as_deref());
    let child = command
        .spawn()
        .map_err(|error| format!("Failed to spawn local VS Code server '{}': {}", executable, error))?;

    let pid = child.id();
    state.pid = Some(pid);

    let started = wait_for_endpoint(
        &config.health_url,
        Duration::from_millis(config.startup_timeout_ms),
    );

    if started {
        state.lifecycle = VsCodeServerLifecycle::Running;
        state.last_error = None;
        return Ok(build_status_response(&state, &config, true));
    }

    if !is_process_alive(pid) {
        state.pid = None;
        state.lifecycle = VsCodeServerLifecycle::Error(
            "Local VS Code server exited before becoming reachable".to_string(),
        );
        state.last_error = Some(format!(
            "Process {} exited before {} became reachable",
            pid, config.health_url
        ));
        return Err(state.last_error.clone().unwrap_or_default());
    }

    let timeout_message = format!(
        "Local VS Code server did not become reachable at {} within {}ms",
        config.health_url, config.startup_timeout_ms
    );
    match shutdown_process(pid) {
        Ok(()) => {
            state.pid = None;
            state.lifecycle = VsCodeServerLifecycle::Error(timeout_message.clone());
            state.last_error = Some(timeout_message.clone());
            Err(timeout_message)
        }
        Err(stop_error) => {
            let combined_message = format!(
                "{}; additionally failed to stop PID {} after timeout: {}",
                timeout_message, pid, stop_error
            );
            state.lifecycle = VsCodeServerLifecycle::Error(combined_message.clone());
            state.last_error = Some(combined_message.clone());
            Err(combined_message)
        }
    }
}

#[tauri::command]
pub async fn vscode_server_stop(
    state: State<'_, Mutex<VsCodeServerState>>,
) -> Result<VsCodeServerStatusResponse, String> {
    let config = resolve_vscode_server_config()?;
    let mut state = state.lock().map_err(|error| error.to_string())?;

    if let Some(pid) = state.pid {
        shutdown_process(pid)?;
        state.pid = None;
    }

    let healthy = endpoint_is_reachable(&config.health_url, Duration::from_millis(400));
    if healthy {
        state.lifecycle = VsCodeServerLifecycle::Running;
        state.last_error = Some(
            "Local VS Code server is still reachable but is not managed by CopilotHub".to_string(),
        );
    } else {
        state.lifecycle = VsCodeServerLifecycle::Stopped;
        state.last_error = None;
    }

    Ok(build_status_response(&state, &config, healthy))
}

#[tauri::command]
pub async fn vscode_server_status(
    state: State<'_, Mutex<VsCodeServerState>>,
) -> Result<VsCodeServerStatusResponse, String> {
    let config = resolve_vscode_server_config()?;
    let mut state = state.lock().map_err(|error| error.to_string())?;
    let healthy = refresh_status_state(&mut state, &config);
    Ok(build_status_response(&state, &config, healthy))
}

#[tauri::command]
pub async fn vscode_extension_list(
    project_path: Option<String>,
) -> Result<VsCodeExtensionDiscoveryResponse, String> {
    let extension_directory = resolve_extension_directory(project_path.as_deref())?;
    discover_extensions_from_directory(extension_directory.as_deref())
}

#[tauri::command]
pub async fn vscode_extension_host_status(
    state: State<'_, Mutex<VsCodeServerState>>,
    project_path: Option<String>,
) -> Result<VsCodeExtensionHostStatusResponse, String> {
    let config = resolve_vscode_server_config()?;
    let mut state = state.lock().map_err(|error| error.to_string())?;
    let local_server_healthy = refresh_status_state(&mut state, &config);
    let extension_directory = resolve_extension_directory(project_path.as_deref())?;
    let discovery = discover_extensions_from_directory(extension_directory.as_deref())?;

    Ok(VsCodeExtensionHostStatusResponse {
        readiness: compute_extension_host_readiness(&discovery, local_server_healthy),
        host_api_available: true,
        can_execute_extensions: false,
        execution_stage: "metadata-only".to_string(),
        extension_directory: discovery.extension_directory.clone(),
        extension_directory_exists: discovery.extension_directory_exists,
        discovered_extension_count: discovery.extensions.len(),
        invalid_entry_count: discovery.invalid_entries.len(),
        local_server_healthy,
        executable_configured: config.command.is_some(),
        summary: summarize_extension_host_status(&discovery, local_server_healthy),
        last_error: state.last_error.clone(),
        remaining_gaps: remaining_extension_host_gaps(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("copilothub-{}-{}", name, unique));
        fs::create_dir_all(&path).expect("temporary directory should be created");
        path
    }

    #[test]
    fn parses_extension_manifest_metadata() {
        let extension_root = unique_temp_dir("manifest");
        let extension_path = extension_root.join("copilothub-tools");
        fs::create_dir_all(&extension_path).expect("extension directory");
        fs::write(
            extension_path.join("package.json"),
            r#"{
                "name": "copilothub-tools",
                "publisher": "darbotlabs",
                "version": "0.1.0",
                "displayName": "CopilotHub Tools",
                "description": "Commands for CopilotHub.",
                "activationEvents": ["onStartupFinished"],
                "extensionKind": ["workspace"],
                "main": "./dist/extension.js",
                "browser": "./dist/web.js",
                "categories": ["Other"],
                "keywords": ["copilothub"],
                "contributes": {
                    "commands": [{ "command": "copilothub.start", "title": "Start" }],
                    "views": { "explorer": [{ "id": "copilothub.view", "name": "CopilotHub" }] }
                }
            }"#,
        )
        .expect("manifest");
        fs::write(extension_path.join("README.md"), "# CopilotHub").expect("readme");

        let extension = parse_extension_manifest(&extension_path).expect("manifest should parse");

        assert_eq!(extension.id, "darbotlabs.copilothub-tools");
        assert_eq!(extension.display_name.as_deref(), Some("CopilotHub Tools"));
        assert_eq!(extension.activation_events, vec!["onStartupFinished"]);
        assert_eq!(extension.entry_points.main.as_deref(), Some("./dist/extension.js"));
        assert_eq!(extension.contributes.commands, 1);
        assert_eq!(extension.contributes.views, 1);
        assert!(extension.readme_path.is_some());

        let _ = fs::remove_dir_all(extension_root);
    }

    #[test]
    fn discovers_valid_and_invalid_extension_entries() {
        let extension_root = unique_temp_dir("discovery");
        let valid_extension = extension_root.join("valid-extension");
        let invalid_extension = extension_root.join("invalid-extension");

        fs::create_dir_all(&valid_extension).expect("valid extension directory");
        fs::create_dir_all(&invalid_extension).expect("invalid extension directory");
        fs::write(
            valid_extension.join("package.json"),
            r#"{
                "name": "valid-extension",
                "version": "1.0.0",
                "publisher": "darbotlabs",
                "activationEvents": ["onCommand:valid.start"],
                "main": "./dist/index.js"
            }"#,
        )
        .expect("valid manifest");

        let discovery =
            discover_extensions_from_directory(Some(&extension_root)).expect("discovery should succeed");

        assert!(discovery.extension_directory_exists);
        assert_eq!(discovery.extensions.len(), 1);
        assert_eq!(discovery.invalid_entries.len(), 1);
        assert_eq!(discovery.extensions[0].id, "darbotlabs.valid-extension");
        assert!(discovery.invalid_entries[0].message.contains("package.json"));

        let _ = fs::remove_dir_all(extension_root);
    }

    #[test]
    fn computes_host_readiness_from_directory_and_server_health() {
        let missing = VsCodeExtensionDiscoveryResponse {
            load_contract: build_extension_load_contract(None),
            extension_directory: None,
            extension_directory_exists: false,
            extensions: Vec::new(),
            invalid_entries: Vec::new(),
        };
        let directory_ready = VsCodeExtensionDiscoveryResponse {
            load_contract: build_extension_load_contract(Some(Path::new("E:/copilothub/.copilothub/extensions"))),
            extension_directory: Some("E:/copilothub/.copilothub/extensions".to_string()),
            extension_directory_exists: true,
            extensions: Vec::new(),
            invalid_entries: Vec::new(),
        };

        assert_eq!(compute_extension_host_readiness(&missing, false), "unavailable");
        assert_eq!(
            compute_extension_host_readiness(&directory_ready, false),
            "discovery-ready"
        );
        assert_eq!(
            compute_extension_host_readiness(&directory_ready, true),
            "host-ready"
        );
    }

    #[test]
    fn ignores_readme_paths_that_escape_the_extension_directory() {
        let extension_root = unique_temp_dir("readme-escape");
        let extension_path = extension_root.join("copilothub-tools");
        let escaped_readme = extension_root.join("README.md");

        fs::create_dir_all(&extension_path).expect("extension directory");
        fs::write(&escaped_readme, "# Outside").expect("escaped readme");
        fs::write(
            extension_path.join("package.json"),
            r#"{
                "name": "copilothub-tools",
                "publisher": "darbotlabs",
                "version": "0.1.0",
                "activationEvents": ["onStartupFinished"],
                "main": "./dist/extension.js",
                "readme": "../README.md"
            }"#,
        )
        .expect("manifest");

        let extension = parse_extension_manifest(&extension_path).expect("manifest should parse");

        assert_eq!(extension.readme_path, None);

        let _ = fs::remove_dir_all(extension_root);
    }

    #[test]
    fn skips_symlinked_extension_directories_during_discovery() {
        #[cfg(target_os = "windows")]
        {
            let extension_root = unique_temp_dir("symlink");
            let target_extension = unique_temp_dir("symlink-target").join("linked-extension");
            let linked_extension = extension_root.join("linked-extension");

            fs::create_dir_all(&target_extension).expect("target extension directory");
            fs::write(
                target_extension.join("package.json"),
                r#"{
                    "name": "linked-extension",
                    "publisher": "darbotlabs",
                    "version": "1.0.0",
                    "activationEvents": ["onCommand:linked.start"],
                    "main": "./dist/index.js"
                }"#,
            )
            .expect("target manifest");

            std::os::windows::fs::symlink_dir(&target_extension, &linked_extension)
                .expect("directory symlink should be created");

            let discovery =
                discover_extensions_from_directory(Some(&extension_root)).expect("discovery should succeed");

            assert!(discovery.extensions.is_empty());
            assert_eq!(discovery.invalid_entries.len(), 1);
            assert!(discovery.invalid_entries[0]
                .message
                .contains("Symlinked extension directories"));

            let _ = fs::remove_dir_all(extension_root);
            let _ = fs::remove_dir_all(target_extension.parent().expect("target parent"));
        }

        #[cfg(not(target_os = "windows"))]
        {
            let extension_root = unique_temp_dir("symlink");
            let target_extension = unique_temp_dir("symlink-target").join("linked-extension");
            let linked_extension = extension_root.join("linked-extension");

            fs::create_dir_all(&target_extension).expect("target extension directory");
            fs::write(
                target_extension.join("package.json"),
                r#"{
                    "name": "linked-extension",
                    "publisher": "darbotlabs",
                    "version": "1.0.0",
                    "activationEvents": ["onCommand:linked.start"],
                    "main": "./dist/index.js"
                }"#,
            )
            .expect("target manifest");

            std::os::unix::fs::symlink(&target_extension, &linked_extension)
                .expect("directory symlink should be created");

            let discovery =
                discover_extensions_from_directory(Some(&extension_root)).expect("discovery should succeed");

            assert!(discovery.extensions.is_empty());
            assert_eq!(discovery.invalid_entries.len(), 1);
            assert!(discovery.invalid_entries[0]
                .message
                .contains("Symlinked extension directories"));

            let _ = fs::remove_dir_all(extension_root);
            let _ = fs::remove_dir_all(target_extension.parent().expect("target parent"));
        }
    }
}
