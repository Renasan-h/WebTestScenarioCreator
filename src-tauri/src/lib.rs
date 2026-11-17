use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use tauri::Emitter;

#[tauri::command]
async fn run_scenario(app: tauri::AppHandle, scenario_json: String) -> Result<(), String> {
    // Development-only runner: production portable build requires a bundled sidecar.
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let mut child = Command::new("node")
        .arg("--import").arg("tsx")
        .arg("sidecar/main.ts")
        .arg("--stdin")
        .current_dir(root)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Node runner could not start: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(scenario_json.as_bytes()).map_err(|e| e.to_string())?;
    }
    let stdout = child.stdout.take().ok_or("Missing stdout")?;
    let stderr = child.stderr.take().ok_or("Missing stderr")?;
    let app_clone = app.clone();
    let out_thread = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().flatten() {
            let _ = app_clone.emit("scenario-log", line);
        }
    });
    let err_thread = std::thread::spawn(move || {
        let mut text = String::new();
        for line in BufReader::new(stderr).lines().flatten() { text.push_str(&line); text.push('\n'); }
        text
    });
    let status = child.wait().map_err(|e| e.to_string())?;
    let _ = out_thread.join();
    let err = err_thread.join().unwrap_or_default();
    if status.success() { Ok(()) } else { Err(err) }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![run_scenario])
        .run(tauri::generate_context!())
        .expect("error while running scenario studio");
}
