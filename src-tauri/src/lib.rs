use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};

#[derive(Default)]
struct RunnerState {
    child: Mutex<Option<Arc<Mutex<Child>>>>,
}

#[tauri::command]
async fn stop_scenario(state: State<'_, RunnerState>) -> Result<(), String> {
    let running = state.child.lock().map_err(|e| e.to_string())?.clone();
    let child = running.ok_or("実行中のシナリオがありません")?;
    child.lock().map_err(|e| e.to_string())?.kill().map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_scenario(
    app: tauri::AppHandle,
    state: State<'_, RunnerState>,
    scenario_json: String,
) -> Result<(), String> {
    // Development-only: the portable release will require a bundled runtime.
    let child_slot = {
        let mut active = state.child.lock().map_err(|e| e.to_string())?;
        if active.is_some() { return Err("別のシナリオが実行中です".into()); }
        let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
        let child = Command::new("node")
            .arg("--import").arg("tsx")
            .arg("sidecar/main.ts")
            .arg("--stdin")
            .current_dir(root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Node runner could not start: {e}"))?;
        let child = Arc::new(Mutex::new(child));
        *active = Some(child.clone());
        child
    };

    let result = tauri::async_runtime::spawn_blocking({
        let app = app.clone();
        let child = child_slot.clone();
        move || -> Result<(), String> {
            let (stdout, stderr, stdin) = {
                let mut process = child.lock().map_err(|e| e.to_string())?;
                (process.stdout.take().ok_or("Missing stdout")?,
                 process.stderr.take().ok_or("Missing stderr")?,
                 process.stdin.take().ok_or("Missing stdin")?)
            };
            let writer = std::thread::spawn(move || -> Result<(), String> {
                let mut input = stdin;
                input.write_all(scenario_json.as_bytes()).map_err(|e| e.to_string())
            });
            let app_clone = app.clone();
            let output = std::thread::spawn(move || {
                for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                    let _ = app_clone.emit("scenario-log", line);
                }
            });
            let errors = std::thread::spawn(move || {
                BufReader::new(stderr).lines().map_while(Result::ok).collect::<Vec<_>>().join("\n")
            });
            let write_result = writer.join().map_err(|_| "stdin thread panicked".to_string())?;
            let status = child.lock().map_err(|e| e.to_string())?.wait().map_err(|e| e.to_string())?;
            let _ = output.join();
            let error_text = errors.join().unwrap_or_default();
            write_result?;
            if status.success() { Ok(()) }
            else { Err(if error_text.is_empty() { format!("Runner exited: {status}") } else { error_text }) }
        }
    }).await.map_err(|e| e.to_string());

    // Clear only our own process, never a newer run.
    let mut active = state.child.lock().map_err(|e| e.to_string())?;
    if active.as_ref().is_some_and(|current| Arc::ptr_eq(current, &child_slot)) {
        *active = None;
    }
    result?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(RunnerState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![run_scenario, stop_scenario])
        .run(tauri::generate_context!())
        .expect("error while running scenario studio");
}
