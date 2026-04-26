// ---------------------------------------------------------------------------
// browser.rs -- Native WebView2 child webview management for CopilotHub
// Creates real browser webviews within the main window, bypassing iframe
// limitations (X-Frame-Options, CSP) that block sites like Copilot Studio.
// Requires Tauri 2.x "unstable" feature for multi-webview support.
// ---------------------------------------------------------------------------

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, State, WebviewBuilder, WebviewUrl};

type BrowserBounds = (f64, f64, f64, f64);

/// Tracks intended position/size per child webview for show/hide via repositioning.
#[derive(Default)]
pub struct BrowserState {
    positions: HashMap<String, BrowserBounds>,
}

fn remember_browser_bounds(state: &Mutex<BrowserState>, label: String, bounds: BrowserBounds) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .positions
        .insert(label, bounds);
    Ok(())
}

fn resize_browser_with_tracking<F>(
    state: &Mutex<BrowserState>,
    label: String,
    bounds: BrowserBounds,
    apply_resize: F,
) -> Result<(), String>
where
    F: FnOnce(&str, BrowserBounds) -> Result<(), String>,
{
    apply_resize(&label, bounds)?;
    remember_browser_bounds(state, label, bounds)
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

    remember_browser_bounds(&state, label, (x, y, width, height))
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
    resize_browser_with_tracking(&state, label, (x, y, width, height), |label, (x, y, width, height)| {
        let wv = app
            .get_webview(label)
            .ok_or_else(|| format!("Webview '{label}' not found"))?;

        wv.set_position(LogicalPosition::new(x, y))
            .map_err(|e: tauri::Error| e.to_string())?;
        wv.set_size(LogicalSize::new(width, height))
            .map_err(|e: tauri::Error| e.to_string())
    })
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn browser_resize_does_not_track_missing_labels() {
        let state = Mutex::new(BrowserState::default());
        remember_browser_bounds(&state, "existing".to_string(), (1.0, 2.0, 3.0, 4.0))
            .expect("seed state");

        let result = resize_browser_with_tracking(
            &state,
            "missing".to_string(),
            (10.0, 20.0, 30.0, 40.0),
            |label, _| Err(format!("Webview '{label}' not found")),
        );

        assert_eq!(result.unwrap_err(), "Webview 'missing' not found");

        let locked = state.lock().expect("state lock");
        assert_eq!(locked.positions.len(), 1);
        assert_eq!(locked.positions.get("existing"), Some(&(1.0, 2.0, 3.0, 4.0)));
        assert!(!locked.positions.contains_key("missing"));
    }
}
