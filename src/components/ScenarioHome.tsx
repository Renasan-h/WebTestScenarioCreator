import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { Scenario } from "../../packages/schema/src/scenario";

export type ScenarioEntry = { path: string; name: string; category: string };

type Props = {
  directory: string;
  onDirectoryChange: (directory: string) => void;
  selectedPath: string | null;
  scenario: Scenario;
  busy: boolean;
  message: string;
  logs: string[];
  errors: string[];
  onSelect: (path: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDebug: () => void;
  onRun: () => void;
  onStop: () => void;
};

export function ScenarioHome({ directory, onDirectoryChange, selectedPath, scenario, busy, message, logs, errors, onSelect, onNew, onOpen, onEdit, onDebug, onRun, onStop }: Props) {
  const [entries, setEntries] = useState<ScenarioEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!directory) { setEntries([]); setError(""); return; }
    let cancelled = false;
    setLoading(true);
    invoke<ScenarioEntry[]>("list_scenario_files", { directory })
      .then(result => { if (!cancelled) { setEntries(result); setError(""); } })
      .catch(reason => { if (!cancelled) { setEntries([]); setError("シナリオの検索に失敗しました: " + String(reason)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [directory, reload]);

  const allEntries = useMemo(() => {
    if (selectedPath && !entries.some(entry => entry.path === selectedPath)) {
      return [{ path: selectedPath, name: scenario.metadata.name, category: "個別に開いたシナリオ" }, ...entries];
    }
    return entries;
  }, [entries, selectedPath, scenario.metadata.name]);

  const groups = useMemo(() => {
    const grouped = new Map<string, ScenarioEntry[]>();
    for (const entry of allEntries) {
      if (!entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && !entry.category.toLocaleLowerCase().includes(query.toLocaleLowerCase())) continue;
      const category = entry.category || "未分類";
      grouped.set(category, [...(grouped.get(category) ?? []), entry]);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, "ja"));
  }, [allEntries, query]);

  async function pickDirectory() {
    try {
      const result = await open({ directory: true, multiple: false, title: "シナリオフォルダーを選択" });
      if (typeof result === "string") onDirectoryChange(result);
    } catch (reason) { setError("ディレクトリ選択に失敗しました: " + String(reason)); }
  }

  return <main className="home-layout" aria-label="TOP画面">
    <aside className="home-sidebar" aria-label="シナリオ一覧">
      <div className="home-sidebar-title"><span className="panel-kicker">SCENARIOS</span><strong>シナリオ一覧</strong><span className="home-count">{allEntries.length}</span></div>
      <button className="home-directory-button" onClick={pickDirectory}>▣ ディレクトリを選択</button>
      <div className="directory-location" title={directory || "未選択"}>{directory || "フォルダーが選択されていません"}</div>
      <div className="home-sidebar-actions">
        <button onClick={() => setReload(value => value + 1)} disabled={!directory || loading} aria-label="シナリオ一覧を更新">↻ 更新</button>
        <button onClick={onOpen}>↗ ファイルを開く</button>
      </div>
      <input aria-label="シナリオ検索" placeholder="シナリオを検索…" value={query} onChange={event => setQuery(event.target.value)}/>
      <div className="scenario-tree">
        {loading && <p>シナリオを読み込み中…</p>}
        {error && <p className="home-error" role="alert">{error}</p>}
        {!loading && !groups.length && <p>一覧が空です。ディレクトリを指定するか、ファイルを開いてください。</p>}
        {groups.map(([category, items]) => <details key={category} open className="scenario-category">
          <summary>▸ {category} <small>{items.length}</small></summary>
          {items.map(entry => <button key={entry.path} className={"scenario-list-item" + (selectedPath === entry.path ? " is-selected" : "")} onClick={() => onSelect(entry.path)} title={entry.path}><span>◇</span><span>{entry.name}</span></button>)}
        </details>)}
      </div>
      <button className="home-new-button" onClick={onNew}>＋ 新しいシナリオ</button>
    </aside>
    <section className="home-content">
      <div className="home-page-heading">
        <div><div className="panel-kicker">WORKSPACE / OVERVIEW</div><h1>シナリオを選択して実行</h1><p>フォルダーからテストを選び、実行・編集・デバッグを切り替えられます。</p></div>
      </div>
      <section className="home-scenario-card" aria-label="選択中のシナリオ">
        <div className="home-card-icon">◇</div>
        <div className="home-card-main">
          <div className="panel-kicker">CURRENT SCENARIO</div>
          <h2>{selectedPath ? scenario.metadata.name : "シナリオを選択してください"}</h2>
          <p>{selectedPath ?? "左側の一覧から選択するか、「新しいシナリオ」を作成してください。"}</p>
          <div className="home-metrics">
            <span><strong>{scenario.nodes.length}</strong> ノード</span>
            <span><strong>{scenario.edges.length}</strong> 接続</span>
            <span><strong>{scenario.settings.browser === "edge" ? "Edge" : "Chromium"}</strong> ブラウザ</span>
          </div>
          {errors.length > 0 && selectedPath && <p className="home-validation">⚠ 接続の確認が必要です（{errors.length}件）</p>}
        </div>
        <div className="home-card-actions">
          <button className="run-button" disabled={!selectedPath || busy} onClick={onRun}>▶ 実行</button>
          <button disabled={!selectedPath || busy} onClick={onEdit}>✎ 編集する</button>
          <button disabled={!selectedPath || busy} onClick={onDebug}>◇ デバッグ</button>
          {busy && <button className="stop-button" onClick={onStop}>■ 停止</button>}
        </div>
      </section>
      <div className="home-bottom-grid">
        <section className="home-info-panel"><div className="panel-kicker">QUICK START</div><h3>使い方</h3>
          <p><b>01</b> ディレクトリを選ぶと、サブフォルダー内の .pflow ファイルも一覧表示されます。</p>
          <p><b>02</b> シナリオを選び、「実行」でブラウザテストを開始します。</p>
          <p><b>03</b> 「編集する」ではノード編集、「デバッグ」ではステップ実行ができます。</p>
        </section>
        <section className="home-info-panel home-log-preview"><div className="panel-kicker">ACTIVITY</div><h3>実行状況</h3><p>{message}</p><pre>{logs.slice(-7).join("\n") || "ここに実行ログが表示されます。"}</pre></section>
      </div>
    </section>
  </main>;
}
