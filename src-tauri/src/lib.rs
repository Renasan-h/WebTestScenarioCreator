use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, State};


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
    shutting_down: std::sync::atomic::AtomicBool,
    shutdown_complete: std::sync::atomic::AtomicBool,
}

#[derive(Debug, PartialEq, Eq)]
enum ExitDecision { Begin, Wait, Allow }

impl RunnerState {
    fn request_exit(&self) -> ExitDecision {
        use std::sync::atomic::Ordering::SeqCst;
        if self.shutdown_complete.load(SeqCst) { return ExitDecision::Allow; }
        if self.shutting_down.swap(true, SeqCst) { ExitDecision::Wait }
        else { ExitDecision::Begin }
    }

    fn ensure_can_start(&self) -> Result<(), String> {
        if self.shutting_down.load(std::sync::atomic::Ordering::SeqCst) {
            Err("アプリ終了処理中です".into())
        } else { Ok(()) }
    }

    // Caller holds the slot lock across initialization and publication.
    fn publish_runner(&self, active: &mut Option<Arc<Mutex<Child>>>, mut child: Child, scenario_json: &str) -> Result<Arc<Mutex<Child>>, String> {
        let initial = child.stdin.as_mut().ok_or_else(|| "Missing stdin".to_string())
            .and_then(|input| {
                input.write_all(scenario_json.as_bytes())
                    .and_then(|_| input.write_all(b"\n"))
                    .and_then(|_| input.flush())
                    .map_err(|e| e.to_string())
            });
        if let Err(error) = initial {
            if let Err(cleanup) = force_stop(&mut child) {
                eprintln!("Runner initialization cleanup failed: {cleanup}");
            }
            return Err(error);
        }
        let child = Arc::new(Mutex::new(child));
        *active = Some(child.clone());
        Ok(child)
    }

    fn cleanup_for_exit(&self, grace: std::time::Duration) -> Result<(), String> {
        let child = self.child.lock().map(|slot| slot.clone()).map_err(|e| e.to_string());
        let result = child.and_then(|child| match child {
            Some(child) => stop_runner(child, grace),
            None => Ok(()),
        });
        self.shutdown_complete.store(true, std::sync::atomic::Ordering::SeqCst);
        result
    }
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

// Only terminate the child owned by this run, never a process selected by name.
fn force_stop(process: &mut Child) -> Result<(), String> {
    if process.try_wait().map_err(|e| e.to_string())?.is_some() { return Ok(()); }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let status = Command::new("taskkill.exe")
            .args(["/PID", &process.id().to_string(), "/T", "/F"])
            .creation_flags(0x08000000)
            .stdout(Stdio::null()).stderr(Stdio::null()).status();
        if matches!(status, Ok(value) if value.success()) { return Ok(()); }
        if process.try_wait().map_err(|e| e.to_string())?.is_none() {
            process.kill().map_err(|e| e.to_string())?;
        }
        return Err("プロセスツリーの終了に失敗しました。ブラウザが残留している可能性があります".into());
    }
    #[cfg(not(windows))]
    process.kill().map_err(|e| e.to_string())
}

fn stop_runner(child: Arc<Mutex<Child>>, grace: std::time::Duration) -> Result<(), String> {
    {
        let mut process = child.lock().map_err(|e| e.to_string())?;
        if process.try_wait().map_err(|e| e.to_string())?.is_some() { return Ok(()); }
        let sent = process.stdin.as_mut().is_some_and(|input| {
            input.write_all(b"STOP\n").and_then(|_| input.flush()).is_ok()
        });
        if !sent { return force_stop(&mut process); }
    }
    let deadline = std::time::Instant::now() + grace;
    loop {
        {
            let mut process = child.lock().map_err(|e| e.to_string())?;
            if process.try_wait().map_err(|e| e.to_string())?.is_some() { return Ok(()); }
            if std::time::Instant::now() >= deadline { return force_stop(&mut process); }
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
}

#[tauri::command]
async fn stop_scenario(state: State<'_, RunnerState>) -> Result<(), String> {
    let child = state.child.lock().map_err(|e| e.to_string())?.clone()
        .ok_or("実行中のシナリオがありません")?;
    tauri::async_runtime::spawn_blocking(move || stop_runner(child, std::time::Duration::from_secs(5)))
        .await.map_err(|e| e.to_string())?
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
        state.ensure_can_start()?;
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
        state.publish_runner(&mut active, child, &scenario_json)?
    };

    let result = tauri::async_runtime::spawn_blocking({
        let app = app.clone();
        let child = child_slot.clone();
        move || -> Result<(), String> {
            let (stdout, stderr) = {
                let mut process = child.lock().map_err(|e| e.to_string())?;
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

    // A failed setup or reader task must not leave a live runner untracked.
    if !matches!(&result, Ok(Ok(()))) {
        if let Err(error) = stop_runner(child_slot.clone(), std::time::Duration::from_secs(5)) {
            eprintln!("Runner cleanup failed: {error}");
        }
    }
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
        .build(tauri::generate_context!())
        .expect("error while building scenario studio")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                let state = app.state::<RunnerState>();
                match state.request_exit() {
                    ExitDecision::Allow => return,
                    ExitDecision::Wait => { api.prevent_exit(); return; }
                    ExitDecision::Begin => api.prevent_exit(),
                }
                let app = app.clone();
                tauri::async_runtime::spawn_blocking(move || {
                    let state = app.state::<RunnerState>();
                    if let Err(error) = state.cleanup_for_exit(std::time::Duration::from_secs(5)) {
                        eprintln!("Shutdown cleanup failed: {error}");
                    }
                    // Allow the exit request generated by AppHandle::exit.
                    app.exit(0);
                });
            }
        });
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

#[cfg(test)]
mod runner_stop_tests {
    use super::*;
    use std::time::{Duration, Instant};

    // Node is already required by the development runner.
    fn runner(script: &str, piped: bool) -> Arc<Mutex<Child>> {
        Arc::new(Mutex::new(Command::new("node")
            .args(["-e", script])
            .stdin(if piped { Stdio::piped() } else { Stdio::null() })
            .stdout(Stdio::null()).stderr(Stdio::null())
            .spawn().expect("Node.js is required for runner tests")))
    }

    fn assert_stopped(child: Arc<Mutex<Child>>, grace: Duration, expected_success: bool) {
        let result = stop_runner(child.clone(), grace);
        let deadline = Instant::now() + Duration::from_secs(3);
        let status = loop {
            let mut process = child.lock().unwrap();
            if let Some(status) = process.try_wait().unwrap() { break Some(status); }
            if Instant::now() >= deadline {
                let _ = process.kill();
                let _ = process.wait();
                break None;
            }
            drop(process);
            std::thread::sleep(Duration::from_millis(50));
        };
        result.expect("stop_runner failed");
        assert_eq!(status.expect("runner remained alive").success(), expected_success);
    }

    #[test]
    fn initial_json_precedes_concurrent_stop() {
        let state = Arc::new(RunnerState::default());
        let mut slot = state.child.lock().unwrap();
        let child = Command::new("node")
            .args(["-e", "let first=true; require('node:readline').createInterface({input:process.stdin}).on('line', line => { if(first){first=false; try { if(JSON.parse(line).name !== '日本語') process.exit(2); } catch { process.exit(3); } } else { process.exit(line === 'STOP' ? 0 : 4); } }); setTimeout(() => process.exit(9), 15000);"])
            .stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null())
            .spawn().unwrap();
        let other = state.clone();
        let (ready_tx, ready_rx) = std::sync::mpsc::channel();
        let stopper = std::thread::spawn(move || {
            ready_tx.send(()).unwrap();
            let child = other.child.lock().unwrap().clone().expect("runner not published");
            stop_runner(child, Duration::from_secs(5))
        });
        ready_rx.recv_timeout(Duration::from_secs(3)).unwrap();
        let child = state.publish_runner(&mut slot, child, r#"{"name":"日本語"}"#).unwrap();
        drop(slot);
        stopper.join().unwrap().unwrap();
        assert!(child.lock().unwrap().try_wait().unwrap().unwrap().success());
    }

    #[test]
    fn missing_initial_stdin_does_not_publish_runner() {
        let state = RunnerState::default();
        let mut slot = state.child.lock().unwrap();
        let child = Command::new("node").args(["-e", "setTimeout(() => process.exit(0), 15000);"])
            .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().unwrap();
        assert!(state.publish_runner(&mut slot, child, "{}").is_err());
        assert!(slot.is_none());
    }

    #[test]
    fn stops_cooperative_runner_gracefully() {
        let child = runner("require('node:readline').createInterface({input:process.stdin}).on('line', line => { if(line === 'STOP') process.exit(0); }); setTimeout(() => process.exit(9), 15000);", true);
        assert_stopped(child, Duration::from_secs(5), true);
    }

    #[test]
    fn forces_unresponsive_runner_after_grace() {
        let child = runner("setTimeout(() => process.exit(0), 15000);", true);
        assert_stopped(child, Duration::from_millis(200), false);
    }

    #[test]
    fn forces_runner_without_stdin() {
        let child = runner("setTimeout(() => process.exit(0), 15000);", false);
        assert_stopped(child, Duration::from_secs(5), false);
    }

    #[test]
    fn shutdown_without_runner_blocks_new_runs_and_allows_exit_after_cleanup() {
        let state = RunnerState::default();
        assert!(state.ensure_can_start().is_ok());
        assert_eq!(state.request_exit(), ExitDecision::Begin);
        assert!(state.ensure_can_start().is_err());
        assert_eq!(state.request_exit(), ExitDecision::Wait);
        state.cleanup_for_exit(Duration::ZERO).unwrap();
        assert_eq!(state.request_exit(), ExitDecision::Allow);
        assert!(state.ensure_can_start().is_err());
    }

    #[test]
    fn shutdown_stops_active_runner() {
        let state = RunnerState::default();
        let child = runner("require('node:readline').createInterface({input:process.stdin}).on('line', line => { if(line === 'STOP') process.exit(0); }); setTimeout(() => process.exit(9), 15000);", true);
        *state.child.lock().unwrap() = Some(child.clone());
        assert_eq!(state.request_exit(), ExitDecision::Begin);
        state.cleanup_for_exit(Duration::from_secs(5)).unwrap();
        assert!(child.lock().unwrap().try_wait().unwrap().unwrap().success());
        assert_eq!(state.request_exit(), ExitDecision::Allow);
    }

    #[test]
    fn shutdown_forces_unresponsive_runner() {
        let state = RunnerState::default();
        let child = runner("setTimeout(() => process.exit(0), 15000);", true);
        *state.child.lock().unwrap() = Some(child.clone());
        assert_eq!(state.request_exit(), ExitDecision::Begin);
        let result = state.cleanup_for_exit(Duration::from_millis(200));
        let deadline = Instant::now() + Duration::from_secs(3);
        let status = loop {
            let mut process = child.lock().unwrap();
            if let Some(status) = process.try_wait().unwrap() { break Some(status); }
            if Instant::now() >= deadline {
                let _ = process.kill();
                let _ = process.wait();
                break None;
            }
            drop(process);
            std::thread::sleep(Duration::from_millis(50));
        };
        result.unwrap();
        assert!(!status.expect("runner remained alive").success());
        assert_eq!(state.request_exit(), ExitDecision::Allow);
    }

    #[test]
    fn stopping_exited_runner_is_idempotent() {
        let child = runner("process.exit(0);", true);
        assert!(child.lock().unwrap().wait().unwrap().success());
        assert_stopped(child, Duration::ZERO, true);
    }
}
