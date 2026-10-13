use std::{net::TcpListener, sync::Mutex};
use tauri::{Manager, RunEvent, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};

struct Api { port: u16, token: String }
struct Engine(Mutex<Option<CommandChild>>);

#[tauri::command]
fn api_info(api: State<'_, Api>) -> (u16, String) { (api.port, api.token.clone()) }

#[tauri::command]
async fn save_export(app: tauri::AppHandle, export_id: String) -> Result<Option<String>, String> {
    if export_id.len() != 32 || !export_id.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("invalid export id".into());
    }
    let src = app.path().app_data_dir().map_err(|e| e.to_string())?
        .join("exports").join(format!("{export_id}.zip"));
    let Some(dest) = app.dialog().file().add_filter("ZIP archive", &["zip"])
        .set_file_name("web-seeker-export.zip").blocking_save_file() else { return Ok(None) };
    let dest = dest.into_path().map_err(|e| e.to_string())?;
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(Some(dest.display().to_string()))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let (port, token, child) = if cfg!(debug_assertions) {
                (8765u16, "dev-token".to_string(), None)            // dev: `npm run engine` runs the API
            } else {
                let port = TcpListener::bind("127.0.0.1:0")?.local_addr()?.port();
                let token = format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple());
                let (mut rx, child) = app.shell().sidecar("webseeker-engine")?
                    .env("WEBSEEKER_TOKEN", &token)
                    .args(vec!["--port".to_string(), port.to_string(),
                               "--data-dir".to_string(), data_dir.to_string_lossy().to_string()])
                    .spawn()?;
                tauri::async_runtime::spawn(async move {
                    while let Some(ev) = rx.recv().await {
                        if let CommandEvent::Stderr(l) = ev { eprintln!("[engine] {}", String::from_utf8_lossy(&l)); }
                    }
                });
                (port, token, Some(child))
            };
            app.manage(Api { port, token });
            app.manage(Engine(Mutex::new(child)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![api_info, save_export])
        .build(tauri::generate_context!())
        .expect("failed to build In Net Web Seeker")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(c) = app.state::<Engine>().0.lock().unwrap().take() { let _ = c.kill(); }
            }
        });
}
