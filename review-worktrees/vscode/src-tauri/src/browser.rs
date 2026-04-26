// ---------------------------------------------------------------------------
// browser.rs -- Native WebView2 child webview management for CopilotHub
// Creates real browser webviews within the main window, bypassing iframe
// limitations (X-Frame-Options, CSP) that block sites like Copilot Studio.
// Requires Tauri 2.x "unstable" feature for multi-webview support.
// ---------------------------------------------------------------------------

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, State, WebviewBuilder, WebviewUrl};

/// Tracks intended position/size per child webview for show/hide via repositioning.
#[derive(Default)]
pub struct BrowserState {
    positions: HashMap<String, (f64, f64, f64, f64)>,
}

/// Create a child WebView2 instance within the main window at the given position.
#[tauri::command]
pub async fn browser_create(
    app: AppHandle,
    state: State<'_, Mutex<BrowserState>>,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    // Tear down any existing webview with the same label
    if let Some(wv) = app.get_webview(&label) {
        let _ = wv.close();
    }

    let window = app
        .get_window("main")
        .ok_or("Main window not found")?;

    let parsed: url::Url = url
        .parse()
        .map_err(|e: url::ParseError| e.to_string())?;

    window
        .add_child(
            WebviewBuilder::new(&label, WebviewUrl::External(parsed)),
            LogicalPosition::new(x, y),
            LogicalSize::new(width, height),
        )
        .map_err(|e: tauri::Error| e.to_string())?;

    state
        .lock()
        .map_err(|e| e.to_string())?
        .positions
        .insert(label, (x, y, width, height));

    Ok(())
}

/// Navigate an existing child webview to a new URL.
#[tauri::command]
pub async fn browser_navigate(
    app: AppHandle,
    label: String,
    url: String,
) -> Result<(), String> {
    let wv = app
        .get_webview(&label)
        .ok_or_else(|| format!("Webview '{label}' not found"))?;
    let parsed: url::Url = url
        .parse()
        .map_err(|e: url::ParseError| e.to_string())?;
    wv.navigate(parsed).map_err(|e: tauri::Error| e.to_string())
}

/// Reposition and resize a child webview (called on layout changes).
#[tauri::command]
pub async fn browser_resize(
    app: AppHandle,
    state: State<'_, Mutex<BrowserState>>,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let wv = app
        .get_webview(&label)
        .ok_or_else(|| format!("Webview '{label}' not found"))?;

    wv.set_position(LogicalPosition::new(x, y))
        .map_err(|e: tauri::Error| e.to_string())?;
    wv.set_size(LogicalSize::new(width, height))
        .map_err(|e: tauri::Error| e.to_string())?;

    state
        .lock()
        .map_err(|e| e.to_string())?
        .positions
        .insert(label, (x, y, width, height));

    Ok(())
}

/// Show a previously hidden child webview by restoring its stored position.
#[tauri::command]
pub async fn browser_show(
    app: AppHandle,
    state: State<'_, Mutex<BrowserState>>,
    label: String,
) -> Result<(), String> {
    let wv = app
        .get_webview(&label)
        .ok_or_else(|| format!("Webview '{label}' not found"))?;

    let s = state.lock().map_err(|e| e.to_string())?;
    if let Some(&(x, y, w, h)) = s.positions.get(&label) {
        wv.set_position(LogicalPosition::new(x, y))
            .map_err(|e: tauri::Error| e.to_string())?;
        wv.set_size(LogicalSize::new(w, h))
            .map_err(|e: tauri::Error| e.to_string())?;
    }

    Ok(())
}

/// Hide a child webview by moving it off-screen.
#[tauri::command]
pub async fn browser_hide(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(wv) = app.get_webview(&label) {
        wv.set_position(LogicalPosition::new(-9999.0, -9999.0))
            .map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

/// Close and destroy a child webview.
#[tauri::command]
pub async fn browser_close(
    app: AppHandle,
    state: State<'_, Mutex<BrowserState>>,
    label: String,
) -> Result<(), String> {
    if let Some(wv) = app.get_webview(&label) {
        wv.close().map_err(|e: tauri::Error| e.to_string())?;
    }

    state
        .lock()
        .map_err(|e| e.to_string())?
        .positions
        .remove(&label);

    Ok(())
}
