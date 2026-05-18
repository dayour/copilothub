use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::env;
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxCatalogEntry {
    id: String,
    label: String,
    available: bool,
    command: Option<String>,
    summary: String,
    unavailable_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxLaunchPlanRequest {
    sandbox_mode: String,
    shell_type: String,
    project_path: String,
    #[serde(default)]
    env_vars: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxLaunchPlan {
    sandbox_mode: String,
    execution_target: String,
    available: bool,
    launch_strategy: String,
    launcher_command: Option<String>,
    launcher_args: Vec<String>,
    working_directory: Option<String>,
    config_path: Option<String>,
    summary: String,
    warnings: Vec<String>,
}

fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

fn candidate_extensions() -> Vec<OsString> {
    if !is_windows() {
        return vec![OsString::new()];
    }

    env::var_os("PATHEXT")
        .map(|value| {
            env::split_paths(&value)
                .map(|path| path.as_os_str().to_os_string())
                .collect::<Vec<_>>()
        })
        .filter(|extensions| !extensions.is_empty())
        .unwrap_or_else(|| {
            vec![
                OsString::from(".COM"),
                OsString::from(".EXE"),
                OsString::from(".BAT"),
                OsString::from(".CMD"),
            ]
        })
}

fn has_executable_extension(path: &Path) -> bool {
    path.extension().is_some()
}

fn resolve_existing_path(path: PathBuf) -> Option<String> {
    if path.is_file() {
        return Some(path.to_string_lossy().to_string());
    }

    None
}

fn find_command_on_path(candidates: &[&str]) -> Option<String> {
    for candidate in candidates {
        let candidate_path = Path::new(candidate);

        if candidate_path.components().count() > 1 {
            if let Some(path) = resolve_existing_path(candidate_path.to_path_buf()) {
                return Some(path);
            }

            if is_windows() && !has_executable_extension(candidate_path) {
                for extension in candidate_extensions() {
                    let mut with_extension = candidate_path.as_os_str().to_os_string();
                    with_extension.push(extension);

                    if let Some(path) = resolve_existing_path(PathBuf::from(with_extension)) {
                        return Some(path);
                    }
                }
            }

            continue;
        }

        let path_value = match env::var_os("PATH") {
            Some(value) => value,
            None => continue,
        };

        for directory in env::split_paths(&path_value) {
            let base_path = directory.join(candidate);

            if let Some(path) = resolve_existing_path(base_path.clone()) {
                return Some(path);
            }

            if is_windows() && !has_executable_extension(Path::new(candidate)) {
                for extension in candidate_extensions() {
                    let mut with_extension = base_path.as_os_str().to_os_string();
                    with_extension.push(extension.clone());

                    if let Some(path) = resolve_existing_path(PathBuf::from(with_extension)) {
                        return Some(path);
                    }
                }
            }
        }
    }

    None
}

fn create_catalog_entry(
    id: &str,
    label: &str,
    available: bool,
    command: Option<String>,
    summary: &str,
    unavailable_reason: Option<&str>,
) -> SandboxCatalogEntry {
    SandboxCatalogEntry {
        id: id.to_string(),
        label: label.to_string(),
        available,
        command,
        summary: summary.to_string(),
        unavailable_reason: unavailable_reason.map(|value| value.to_string()),
    }
}

fn build_sandbox_catalog() -> Vec<SandboxCatalogEntry> {
    if !is_windows() {
        return vec![
            create_catalog_entry(
                "windows-sandbox",
                "Windows Sandbox",
                false,
                None,
                "Disposable Windows VM entry point for explicit launch preparation.",
                Some("Windows Sandbox is only available on Windows hosts."),
            ),
            create_catalog_entry(
                "wsl",
                "WSL",
                false,
                None,
                "Linux execution target through Windows Subsystem for Linux.",
                Some("WSL is only available on Windows hosts."),
            ),
        ];
    }

    let windows_sandbox = find_command_on_path(&["WindowsSandbox.exe", "WindowsSandbox"]);
    let wsl = find_command_on_path(&["wsl.exe", "wsl"]);

    vec![
        create_catalog_entry(
            "windows-sandbox",
            "Windows Sandbox",
            windows_sandbox.is_some(),
            windows_sandbox,
            "Disposable Windows VM entry point for explicit launch preparation.",
            Some("Windows Sandbox was not found. Enable the feature on this machine first."),
        ),
        create_catalog_entry(
            "wsl",
            "WSL",
            wsl.is_some(),
            wsl,
            "Linux execution target through Windows Subsystem for Linux.",
            Some("wsl.exe was not found. Install or enable Windows Subsystem for Linux first."),
        ),
    ]
}

fn derive_summary(mode: &str) -> (String, String, Vec<String>) {
    match mode {
        "full-access" => (
            "host".to_string(),
            "Commands run directly on the host with the current user account. CopilotHub does not apply filesystem or VM isolation in this mode.".to_string(),
            vec![
                "No operating system sandbox is applied.".to_string(),
                "Processes inherit the current user profile and host access.".to_string(),
            ],
        ),
        "wsl" => (
            "wsl".to_string(),
            "Commands are routed toward a WSL Linux environment when available. This is an alternate execution target, not a hardened security boundary.".to_string(),
            vec![
                "WSL can access mounted Windows files depending on distro configuration.".to_string(),
                "Host networking and user trust still apply.".to_string(),
            ],
        ),
        "windows-sandbox" => (
            "windows-sandbox".to_string(),
            "CopilotHub can prepare a Windows Sandbox launch for this session. The sandbox VM is disposable, but mapped folders still bridge data with the host.".to_string(),
            vec![
                "Session provisioning and attachment remain staged after launch preparation."
                    .to_string(),
                "Mapped workspace folders can still expose host files to the sandbox.".to_string(),
            ],
        ),
        _ => (
            "host".to_string(),
            "Commands run on the host OS and are expected to stay within the selected workspace path. This is a workflow convention, not an operating system sandbox.".to_string(),
            vec![
                "No VM or container isolation is applied.".to_string(),
                "Host processes may still reach resources outside the workspace if invoked to do so."
                    .to_string(),
            ],
        ),
    }
}

fn windows_path_to_wsl(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    let bytes = normalized.as_bytes();
    if bytes.len() >= 2 && bytes[1] == b':' {
        let drive = normalized
            .chars()
            .next()
            .unwrap_or('c')
            .to_ascii_lowercase();
        let remainder = normalized[2..].trim_start_matches('/');
        if remainder.is_empty() {
            return format!("/mnt/{drive}");
        }

        return format!("/mnt/{drive}/{remainder}");
    }

    normalized
}

fn escape_windows_sandbox_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn create_windows_sandbox_config(project_path: &str) -> Result<String, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    let config_dir = env::temp_dir().join("copilothub-sandbox");
    fs::create_dir_all(&config_dir).map_err(|error| error.to_string())?;
    let config_path = config_dir.join(format!("session-{timestamp}.wsb"));

    let escaped_project_path = escape_windows_sandbox_xml(project_path);
    // Extract a single drive letter from the host project path. Anything else
    // (UNC shares, relative paths, oddly formed prefixes) falls back to "C" to
    // keep the synthesized sandbox workspace path well-formed.
    let host_drive_letter = PathBuf::from(project_path)
        .components()
        .next()
        .and_then(|component| {
            let raw = component.as_os_str().to_string_lossy().to_string();
            let trimmed = raw.trim_end_matches(':');
            // Accept only single ASCII letters (e.g. "C", "D"); reject UNC etc.
            if trimmed.len() == 1
                && trimmed
                    .chars()
                    .next()
                    .map(|c| c.is_ascii_alphabetic())
                    .unwrap_or(false)
            {
                Some(trimmed.to_ascii_uppercase())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "C".to_string());
    let sandbox_workspace = format!(
        r#"C:\Users\WDAGUtilityAccount\Desktop\{}Workspace"#,
        host_drive_letter
    );
    let escaped_sandbox_workspace = escape_windows_sandbox_xml(&sandbox_workspace);
    // NOTE: PowerShell -Command argument must be a balanced quoted string.
    // The trailing `"` here closes the `-Command "..."` argument so the sandbox
    // launcher does not pass a malformed command line to powershell.exe.
    let escaped_logon_command = escape_windows_sandbox_xml(&format!(
        r#"powershell.exe -NoLogo -NoExit -Command "if (Test-Path '{sandbox_workspace}') {{ Set-Location '{sandbox_workspace}' }}""#
    ));

    let config = format!(
        r#"<Configuration>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>{escaped_project_path}</HostFolder>
      <SandboxFolder>{escaped_sandbox_workspace}</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>{escaped_logon_command}</Command>
  </LogonCommand>
</Configuration>"#
    );

    fs::write(&config_path, config).map_err(|error| error.to_string())?;

    Ok(config_path.to_string_lossy().to_string())
}

fn build_host_launch_plan(request: &SandboxLaunchPlanRequest) -> SandboxLaunchPlan {
    let (execution_target, summary, warnings) = derive_summary(&request.sandbox_mode);
    SandboxLaunchPlan {
        sandbox_mode: request.sandbox_mode.clone(),
        execution_target: execution_target.clone(),
        available: true,
        launch_strategy: execution_target,
        launcher_command: None,
        launcher_args: Vec::new(),
        working_directory: Some(request.project_path.clone()),
        config_path: None,
        summary,
        warnings,
    }
}

#[tauri::command]
pub fn sandbox_catalog() -> Vec<SandboxCatalogEntry> {
    build_sandbox_catalog()
}

#[tauri::command]
pub fn sandbox_prepare_session_launch(
    request: SandboxLaunchPlanRequest,
) -> Result<SandboxLaunchPlan, String> {
    if request.sandbox_mode == "workspace-write" || request.sandbox_mode == "full-access" {
        return Ok(build_host_launch_plan(&request));
    }

    let (execution_target, summary, mut warnings) = derive_summary(&request.sandbox_mode);

    if !is_windows() {
        warnings.push("Sandbox launch preparation is only implemented for Windows hosts.".to_string());
        return Ok(SandboxLaunchPlan {
            sandbox_mode: request.sandbox_mode,
            execution_target: execution_target.clone(),
            available: false,
            launch_strategy: execution_target,
            launcher_command: None,
            launcher_args: Vec::new(),
            working_directory: Some(request.project_path),
            config_path: None,
            summary,
            warnings,
        });
    }

    if request.sandbox_mode == "wsl" {
        let command = find_command_on_path(&["wsl.exe", "wsl"]);
        let available = command.is_some();
        if !available {
            warnings.push(
                "wsl.exe was not found. Install or enable Windows Subsystem for Linux first."
                    .to_string(),
            );
        }

        let working_directory = windows_path_to_wsl(&request.project_path);
        let launcher_args = vec!["--cd".to_string(), working_directory.clone()];
        let mut filtered_env_vars = request
            .env_vars
            .keys()
            .take(3)
            .cloned()
            .collect::<Vec<_>>();
        filtered_env_vars.sort();
        if !filtered_env_vars.is_empty() {
            warnings.push(format!(
                "Environment variables are not injected into WSL automatically yet. Pending keys: {}.",
                filtered_env_vars.join(", ")
            ));
        }

        return Ok(SandboxLaunchPlan {
            sandbox_mode: request.sandbox_mode,
            execution_target: execution_target.clone(),
            available,
            launch_strategy: execution_target,
            launcher_command: command,
            launcher_args,
            working_directory: Some(working_directory),
            config_path: None,
            summary,
            warnings,
        });
    }

    let command = find_command_on_path(&["WindowsSandbox.exe", "WindowsSandbox"]);
    let available = command.is_some();
    let config_path = if available {
        Some(create_windows_sandbox_config(&request.project_path)?)
    } else {
        warnings.push(
            "Windows Sandbox was not found. Enable the feature on this machine first.".to_string(),
        );
        None
    };

    let launcher_args = config_path
        .as_ref()
        .map(|value| vec![value.clone()])
        .unwrap_or_default();
    let mut launch_warnings = warnings;
    if request.shell_type == "wsl" {
        launch_warnings.push(
            "Windows Sandbox launches a Windows shell today. WSL shell provisioning inside the VM remains staged."
                .to_string(),
        );
    }

    Ok(SandboxLaunchPlan {
        sandbox_mode: request.sandbox_mode,
        execution_target: execution_target.clone(),
        available,
        launch_strategy: execution_target,
        launcher_command: command,
        launcher_args,
        working_directory: Some(request.project_path),
        config_path,
        summary,
        warnings: launch_warnings,
    })
}
