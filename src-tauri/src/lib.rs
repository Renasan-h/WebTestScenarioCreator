use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, State};


#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ScenarioEntry {
    path: String,
    name: String,
    category: String,
}

fn is_scenario_file(path: &std::path::Path) -> bool {
    path.extension().and_then(|extension| extension.to_str()).is_some_and(|extension| extension.eq_ignore_ascii_case("pflow"))
}

fn collect_scenario_files(
    base: &std::path::Path,
    folder: &std::path::Path,
    depth: usize,
    results: &mut Vec<ScenarioEntry>,
) -> Result<(), String> {
    if depth > 8 || results.len() >= 2000 { return Ok(()); }
    let entries = std::fs::read_dir(folder).map_err(|error| error.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let kind = entry.file_type().map_err(|error| error.to_string())?;
        let path = entry.path();
        if kind.is_dir() {
            if !entry.file_name().to_string_lossy().starts_with('.') {
                collect_scenario_files(base, &path, depth + 1, results)?;
            }
        } else if kind.is_file() && is_scenario_file(&path) {
            let fallback = path.file_stem().unwrap_or_default().to_string_lossy().into_owned();
            let name = std::fs::read_to_string(&path).ok()
                .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
                .and_then(|value| value.get("metadata")?.get("name")?.as_str().map(String::from))
                .filter(|value| !value.is_empty())
                .unwrap_or(fallback);
            let category = path.parent().unwrap_or(base).strip_prefix(base)
                .unwrap_or(std::path::Path::new(""))
                .to_string_lossy().replace('\\', "/");
            results.push(ScenarioEntry {
                path: path.to_string_lossy().into_owned(),
                name,
                category: if category.is_empty() { "未分類".into() } else { category },
            });
        }
    }
    Ok(())
}

#[tauri::command]
async fn list_scenario_files(directory: String) -> Result<Vec<ScenarioEntry>, String> {
    let base = std::fs::canonicalize(&directory).map_err(|error| error.to_string())?;
    if !base.is_dir() { return Err("ディレクトリを選択してください".into()); }
    let mut results = Vec::new();
    collect_scenario_files(&base, &base, 0, &mut results)?;
    results.sort_by(|a, b| a.category.cmp(&b.category).then_with(|| a.name.cmp(&b.name)));
    Ok(results)
}

#[tauri::command]
async fn read_scenario_file(path: String) -> Result<String, String> {
    let file = std::path::Path::new(&path);
    if !is_scenario_file(file) { return Err(".pflow ファイルを選択してください".into()); }
    std::fs::read_to_string(file).map_err(|error| error.to_string())
}

#[tauri::command]
async fn write_scenario_file(path: String, content: String) -> Result<(), String> {
    let file = std::path::Path::new(&path);
    if !is_scenario_file(file) { return Err(".pflow ファイルのみ保存できます".into()); }
    std::fs::write(file, content).map_err(|error| error.to_string())
}

#[derive(Default)]
struct RunnerState {
    child: Mutex<Option<Arc<Mutex<Child>>>>,
}

#[tauri::command]
async fn debug_control(state: State<'_, RunnerState>, command: String) -> Result<(), String> {
    if command != "STEP" && command != "CONTINUE" { return Err("Invalid debug command".into()); }
    let child = state.child.lock().map_err(|e| e.to_string())?.clone().ok_or("実行中のシナリオがありません")?;
    let mut process = child.lock().map_err(|e| e.to_string())?;
    let input = process.stdin.as_mut().ok_or("Missing stdin")?;
    input.write_all(format!("{command}\n").as_bytes()).map_err(|e| e.to_string())?;
    input.flush().map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_scenario(state: State<'_, RunnerState>) -> Result<(), String> {
    let running = state.child.lock().map_err(|e| e.to_string())?.clone();
    let child = running.ok_or("実行中のシナリオがありません")?;
    let mut process = child.lock().map_err(|e| e.to_string())?;
    if process.try_wait().map_err(|e| e.to_string())?.is_some() { return Ok(()); }
    if let Some(input) = process.stdin.as_mut() {
        input.write_all(b"STOP\n").map_err(|e| e.to_string())?;
        input.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        process.kill().map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn run_scenario(
    app: tauri::AppHandle,
    state: State<'_, RunnerState>,
    scenario_json: String,
    record: Option<bool>,
    debug: Option<bool>,
) -> Result<(), String> {
    // Development-only: the portable release will require a bundled runtime.
    let child_slot = {
        let mut active = state.child.lock().map_err(|e| e.to_string())?;
        if active.is_some() { return Err("別のシナリオが実行中です".into()); }
        let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
        let mut command = Command::new("node");
        command.arg("--import").arg("tsx").arg("sidecar/main.ts").arg("--stdin");
        if record.unwrap_or(false) { command.arg("--record"); }
        if debug.unwrap_or(false) { command.arg("--debug"); }
        let child = command.current_dir(root)
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
            let (stdout, stderr) = {
                let mut process = child.lock().map_err(|e| e.to_string())?;
                let input = process.stdin.as_mut().ok_or("Missing stdin")?;
                input.write_all(scenario_json.as_bytes()).map_err(|e| e.to_string())?;
                input.write_all(b"\n").map_err(|e| e.to_string())?;
                input.flush().map_err(|e| e.to_string())?;
                (process.stdout.take().ok_or("Missing stdout")?,
                 process.stderr.take().ok_or("Missing stderr")?)
            };
            let app_clone = app.clone();
            let output = std::thread::spawn(move || {
                for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                    let _ = app_clone.emit("scenario-log", line);
                }
            });
            let errors = std::thread::spawn(move || {
                BufReader::new(stderr).lines().map_while(Result::ok).collect::<Vec<_>>().join("\n")
            });
            let status = loop {
                let polled = child.lock().map_err(|e| e.to_string())?.try_wait().map_err(|e| e.to_string())?;
                if let Some(status) = polled { break status; }
                std::thread::sleep(std::time::Duration::from_millis(50));
            };
            let _ = output.join();
            let error_text = errors.join().unwrap_or_default();
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
        .invoke_handler(tauri::generate_handler![run_scenario, stop_scenario, debug_control, list_scenario_files, read_scenario_file, write_scenario_file])
        .run(tauri::generate_context!())
        .expect("error while running scenario studio");
}

#[cfg(test)]
mod scenario_directory_tests {
    use super::*;

    #[test]
    fn finds_nested_pflow_files_and_uses_metadata_name() {
        let root = std::env::temp_dir().join(format!("scenario-index-{}", std::process::id()));
        let nested = root.join("認証");
        std::fs::create_dir_all(&nested).unwrap();
        std::fs::write(root.join("root.pflow"), r#"{"metadata":{"name":"トップ"}} "#).unwrap();
        std::fs::write(nested.join("login.PFLOW"), r#"{"metadata":{"name":"ログイン"}} "#).unwrap();
        std::fs::write(nested.join("notes.txt"), "not a scenario").unwrap();
        let mut results = Vec::new();
        collect_scenario_files(&root, &root, 0, &mut results).unwrap();
        assert_eq!(results.len(), 2);
        assert!(results.iter().any(|item| item.name == "トップ" && item.category == "未分類"));
        assert!(results.iter().any(|item| item.name == "ログイン" && item.category == "認証"));
        std::fs::remove_dir_all(&root).unwrap();
    }
}
