use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/// Sidecar lifecycle states. Avoids stringly-typed status comparisons.
#[derive(Clone, Debug, PartialEq)]
pub enum SidecarLifecycle {
    Stopped,
    Starting,
    Running,
    Stopping,
    Error(String),
}

impl SidecarLifecycle {
    fn as_str(&self) -> &str {
        match self {
            Self::Stopped => "stopped",
            Self::Starting => "starting",
            Self::Running => "running",
            Self::Stopping => "stopping",
            Self::Error(_) => "error",
        }
    }
}

pub struct SidecarState {
    pid: Option<u32>,
    lifecycle: SidecarLifecycle,
    port: u16,
    last_error: Option<String>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            pid: None,
            lifecycle: SidecarLifecycle::Stopped,
            port: 3000,
            last_error: None,
        }
    }
}

/// Check whether a process with the given PID is still alive.
fn is_process_alive(pid: u32) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
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
        // POSIX: signal 0 tests process existence without killing it.
        unsafe { libc::kill(pid as i32, 0) == 0 }
    }
}

/// Attempt graceful shutdown, falling back to force kill after a timeout.
fn shutdown_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, send taskkill without /F first (graceful), then /F.
        let graceful = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string()])
            .output();

        if let Ok(output) = graceful {
            if output.status.success() {
                // Wait briefly for process to exit.
                std::thread::sleep(std::time::Duration::from_millis(500));
                if !is_process_alive(pid) {
                    return Ok(());
                }
            }
        }

        // Force kill.
        let forced = std::process::Command::new("taskkill")
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
        use std::process::Command;

        // SIGTERM first.
        let _ = Command::new("kill")
            .args(["-15", &pid.to_string()])
            .output();

        std::thread::sleep(std::time::Duration::from_millis(500));

        if !is_process_alive(pid) {
            return Ok(());
        }

        // SIGKILL fallback.
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

/// Validate that a port number falls in the user-space range.
fn validate_port(port: u16) -> Result<(), String> {
  if port < 1024 {
    return Err(format!("Port {} is in the privileged range (< 1024)", port));
  }
  Ok(())
}

fn sidecar_binary_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(explicit_path) = std::env::var("COPILOTHUB_SIDECAR_PATH") {
        if !explicit_path.trim().is_empty() {
            candidates.push(PathBuf::from(explicit_path));
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        #[cfg(target_os = "windows")]
        {
            candidates.push(resource_dir.join("sidecars").join("copilot-browser.exe"));
            candidates.push(resource_dir.join("sidecars").join("copilotbrowser-sidecar.exe"));
        }
        #[cfg(not(target_os = "windows"))]
        {
            candidates.push(resource_dir.join("sidecars").join("copilot-browser"));
            candidates.push(resource_dir.join("sidecars").join("copilotbrowser-sidecar"));
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        #[cfg(target_os = "windows")]
        {
            candidates.push(cwd.join("src-tauri").join("sidecars").join("copilot-browser.exe"));
            candidates.push(cwd.join("src-tauri").join("sidecars").join("copilotbrowser-sidecar.exe"));
        }
        #[cfg(not(target_os = "windows"))]
        {
            candidates.push(cwd.join("src-tauri").join("sidecars").join("copilot-browser"));
            candidates.push(cwd.join("src-tauri").join("sidecars").join("copilotbrowser-sidecar"));
        }
    }

    candidates
}

fn resolve_sidecar_binary(app: &AppHandle) -> Result<PathBuf, String> {
    let candidates = sidecar_binary_candidates(app);

    if let Some(path) = candidates.iter().find(|path| path.is_file()) {
        return Ok(path.clone());
    }

    let searched = candidates
        .iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join("; ");
    Err(format!(
        "Sidecar binary not found. Set COPILOTHUB_SIDECAR_PATH or place sidecar in src-tauri/sidecars. Searched: {}",
        searched
    ))
}

#[tauri::command]
pub async fn start_sidecar(
    app: AppHandle,
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;

    if s.lifecycle == SidecarLifecycle::Running {
        // If we think it's running, verify the process is still alive.
        if let Some(pid) = s.pid {
            if is_process_alive(pid) {
                return Ok(format!("Sidecar already running on port {} (PID {})", s.port, pid));
            }
            // Process died unexpectedly -- allow restart.
            s.last_error = Some(format!("Sidecar PID {} exited unexpectedly", pid));
            s.pid = None;
        }
    }

    if s.lifecycle == SidecarLifecycle::Starting {
        return Err("Sidecar is already starting; please wait".to_string());
    }

    validate_port(s.port)?;

    s.lifecycle = SidecarLifecycle::Starting;
    s.last_error = None;
    s.pid = None;

    let executable = match resolve_sidecar_binary(&app) {
        Ok(path) => path,
        Err(error_message) => {
            s.lifecycle = SidecarLifecycle::Error(error_message.clone());
            s.last_error = Some(error_message.clone());
            return Err(error_message);
        }
    };

    let child = match std::process::Command::new(&executable).spawn() {
        Ok(child) => child,
        Err(error) => {
            let error_message = format!("Failed to spawn sidecar at {}: {}", executable.display(), error);
            s.lifecycle = SidecarLifecycle::Error(error_message.clone());
            s.last_error = Some(error_message.clone());
            return Err(error_message);
        }
    };

    let pid = child.id();
    std::thread::sleep(std::time::Duration::from_millis(150));
    if !is_process_alive(pid) {
        let error_message = format!(
            "Sidecar process exited immediately after start (path: {}, pid: {})",
            executable.display(),
            pid
        );
        s.lifecycle = SidecarLifecycle::Error(error_message.clone());
        s.last_error = Some(error_message.clone());
        s.pid = None;
        return Err(error_message);
    }

    s.pid = Some(pid);
    s.lifecycle = SidecarLifecycle::Running;
    Ok(format!(
        "Sidecar started on port {} (PID {}, path: {})",
        s.port,
        pid,
        executable.display()
    ))
}

#[tauri::command]
pub async fn stop_sidecar(state: State<'_, Mutex<SidecarState>>) -> Result<String, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;

    match s.lifecycle {
        SidecarLifecycle::Stopped => return Ok("Sidecar is already stopped".to_string()),
        SidecarLifecycle::Stopping => return Err("Sidecar is already shutting down".to_string()),
        _ => {}
    }

    s.lifecycle = SidecarLifecycle::Stopping;

    if let Some(pid) = s.pid {
        if let Err(e) = shutdown_process(pid) {
            s.lifecycle = SidecarLifecycle::Error(e.clone());
            s.last_error = Some(e.clone());
            return Err(e);
        }
    }

    s.lifecycle = SidecarLifecycle::Stopped;
    s.pid = None;
    s.last_error = None;
    Ok("Sidecar stopped".to_string())
}

#[tauri::command]
pub async fn sidecar_status(state: State<'_, Mutex<SidecarState>>) -> Result<String, String> {
    let s = state.lock().map_err(|e| e.to_string())?;
    Ok(s.lifecycle.as_str().to_string())
}

#[tauri::command]
pub async fn sidecar_health(state: State<'_, Mutex<SidecarState>>) -> Result<String, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;

    if s.lifecycle != SidecarLifecycle::Running {
        return Ok(serde_json::json!({
            "healthy": false,
            "reason": format!("Sidecar is {}", s.lifecycle.as_str()),
        })
        .to_string());
    }

    match s.pid {
        Some(pid) if is_process_alive(pid) => Ok(serde_json::json!({
            "healthy": true,
            "pid": pid,
            "port": s.port,
        })
        .to_string()),
        Some(pid) => {
            s.lifecycle = SidecarLifecycle::Error("Process exited unexpectedly".to_string());
            s.last_error = Some(format!("PID {} no longer alive", pid));
            s.pid = None;
            Ok(serde_json::json!({
                "healthy": false,
                "reason": format!("PID {} is no longer alive", pid),
            })
            .to_string())
        }
        None => {
            Ok(serde_json::json!({
                "healthy": false,
                "reason": "No sidecar PID is currently tracked",
            })
            .to_string())
        }
    }
}
