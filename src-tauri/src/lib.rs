mod browser;
mod process;
mod sandbox;
mod sidecar;
mod streamable_http_server;
mod terminal;
mod vscode;

use std::sync::Mutex;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(sidecar::SidecarState::default()))
        .manage(Mutex::new(browser::BrowserState::default()))
        .manage(Mutex::new(vscode::VsCodeServerState::default()))
        .manage(Mutex::new(
            streamable_http_server::StreamableHttpServerState::default(),
        ))
        .invoke_handler(tauri::generate_handler![
            greet,
            sidecar::start_sidecar,
            sidecar::stop_sidecar,
            sidecar::sidecar_status,
            sidecar::sidecar_health,
            vscode::vscode_server_start,
            vscode::vscode_server_stop,
            vscode::vscode_server_status,
            vscode::vscode_extension_list,
            vscode::vscode_extension_host_status,
            browser::browser_create,
            browser::browser_navigate,
            browser::browser_reload,
            browser::browser_go_back,
            browser::browser_go_forward,
            browser::browser_stop,
            browser::browser_resize,
            browser::browser_show,
            browser::browser_hide,
            browser::browser_close,
            sandbox::sandbox_catalog,
            sandbox::sandbox_prepare_session_launch,
            terminal::terminal_shell_catalog,
            streamable_http_server::sync_streamable_http_server_session_contexts,
            streamable_http_server::start_streamable_http_server,
            streamable_http_server::stop_streamable_http_server,
            streamable_http_server::streamable_http_server_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
