use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct SidecarState {
    pid: Option<u32>,
    status: String, // "stopped", "starting", "running", "error"
    port: u16,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            pid: None,
            status: "stopped".to_string(),
            port: 3000,
        }
    }
}

#[tauri::command]
pub async fn start_sidecar(
    app: AppHandle,
    state: State<'_, Mutex<SidecarState>>,
) -> Result<String, String> {
    let _ = app.path();

    // Use tauri_plugin_shell to spawn the sidecar process
    // The sidecar will be: node copilotbrowser-sidecar.js --port 3000
    // For now, just update state to "starting" then "running"
    // Return the port number
    let mut s = state.lock().map_err(|e| e.to_string())?;
    if s.status == "running" {
        return Ok(format!("Sidecar already running on port {}", s.port));
    }
    s.status = "starting".to_string();
    s.port = 3000;

    // TODO: Actually spawn the process via tauri_plugin_shell
    // For MVP, simulate readiness
    s.status = "running".to_string();

    Ok(format!("Sidecar started on port {}", s.port))
}

#[tauri::command]
pub async fn stop_sidecar(state: State<'_, Mutex<SidecarState>>) -> Result<String, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    if let Some(pid) = s.pid {
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output();
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
    }
    s.status = "stopped".to_string();
    s.pid = None;
    Ok("Sidecar stopped".to_string())
}

#[tauri::command]
pub async fn sidecar_status(state: State<'_, Mutex<SidecarState>>) -> Result<String, String> {
    let s = state.lock().map_err(|e| e.to_string())?;
    Ok(s.status.clone())
}
