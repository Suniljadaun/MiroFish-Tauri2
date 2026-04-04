use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

// ── Shared state ────────────────────────────────────────────────────────────

pub struct ServerState {
    pub child: Option<CommandChild>,
    pub port: u16,
    pub ready: bool,
}

impl Default for ServerState {
    fn default() -> Self {
        Self { child: None, port: 5001, ready: false }
    }
}

pub type SharedServerState = Arc<Mutex<ServerState>>;

// ── Tauri Commands ───────────────────────────────────────────────────────────

/// Start the Python sidecar backend
#[tauri::command]
async fn start_backend(
    app: AppHandle,
    state: State<'_, SharedServerState>,
    llm_api_key: String,
    llm_base_url: String,
    llm_model_name: String,
    zep_api_key: String,
) -> Result<String, String> {
    let mut srv = state.lock().map_err(|e| e.to_string())?;

    if srv.child.is_some() {
        return Ok("already_running".into());
    }

    let sidecar_cmd = app
        .shell()
        .sidecar("binaries/mirofish-server")
        .map_err(|e| format!("Sidecar not found: {e}"))?
        .env("LLM_API_KEY", &llm_api_key)
        .env("LLM_BASE_URL", &llm_base_url)
        .env("LLM_MODEL_NAME", &llm_model_name)
        .env("ZEP_API_KEY", &zep_api_key)
        .env("FLASK_PORT", srv.port.to_string())
        .env("FLASK_DEBUG", "false");

    let (mut _rx, child) = sidecar_cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {e}"))?;

    srv.child = Some(child);

    // Emit event so frontend can poll /health
    app.emit("backend-starting", ()).ok();

    Ok("started".into())
}

/// Stop the Python sidecar backend
#[tauri::command]
async fn stop_backend(state: State<'_, SharedServerState>) -> Result<String, String> {
    let mut srv = state.lock().map_err(|e| e.to_string())?;
    if let Some(child) = srv.child.take() {
        child.kill().map_err(|e| format!("Kill failed: {e}"))?;
        srv.ready = false;
        Ok("stopped".into())
    } else {
        Ok("not_running".into())
    }
}

/// Check whether the backend process is alive (Rust side)
#[tauri::command]
async fn backend_status(state: State<'_, SharedServerState>) -> Result<String, String> {
    let srv = state.lock().map_err(|e| e.to_string())?;
    if srv.child.is_some() {
        Ok("running".into())
    } else {
        Ok("stopped".into())
    }
}

/// Mark backend as ready (called by frontend after /health 200)
#[tauri::command]
async fn set_backend_ready(state: State<'_, SharedServerState>) -> Result<(), String> {
    let mut srv = state.lock().map_err(|e| e.to_string())?;
    srv.ready = true;
    Ok(())
}

/// Get the port the backend is running on
#[tauri::command]
async fn get_backend_port(state: State<'_, SharedServerState>) -> Result<u16, String> {
    let srv = state.lock().map_err(|e| e.to_string())?;
    Ok(srv.port)
}

// ── App lifecycle ────────────────────────────────────────────────────────────

pub fn run() {
    let server_state: SharedServerState = Arc::new(Mutex::new(ServerState::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(server_state.clone())
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            backend_status,
            set_backend_ready,
            get_backend_port,
        ])
        .on_window_event({
            let state = server_state.clone();
            move |_window, event| {
                if let tauri::WindowEvent::Destroyed = event {
                    // Kill Python sidecar when window closes
                    if let Ok(mut srv) = state.lock() {
                        if let Some(child) = srv.child.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
