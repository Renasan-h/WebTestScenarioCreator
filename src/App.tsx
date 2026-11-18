import { useCallback, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, type Connection, type Node, type Edge } from "@xyflow/react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { exportPlaywrightTest } from "../packages/engine/src/export";
import type { RecordedAction } from "../packages/playwright-adapter/src/record";
import { appendRecordedAction } from "../packages/playwright-adapter/src/record-graph";
import { listen } from "@tauri-apps/api/event";
import { scenarioSchema, validateGraph, type Scenario, type ScenarioNode } from "../packages/schema/src/scenario";

const stamp = () => new Date().toISOString();
function fresh(): Scenario {
  return { schemaVersion: "1.0", metadata: { id: crypto.randomUUID(), name: "新しいシナリオ", createdAt: stamp(), updatedAt: stamp() }, settings: { browser: "edge", headless: false, timeoutMs: 10000, viewport: { width: 1280, height: 720 } }, variables: {}, nodes: [
    { id: crypto.randomUUID(), type: "start", label: "開始", position: { x: 120, y: 100 }, config: {} },
    { id: crypto.randomUUID(), type: "end", label: "終了", position: { x: 120, y: 300 }, config: {} },
  ], edges: [] };
}
function toFlow(s: Scenario): { nodes: Node[]; edges: Edge[] } {
  return { nodes: s.nodes.map(n => ({ id: n.id, position: n.position, data: { label: n.label }, type: "default" })), edges: s.edges.map(e => ({ ...e })) };
}
const actions: { type: ScenarioNode["type"]; name: string }[] = [
  { type: "navigate", name: "URL移動" }, { type: "click", name: "クリック" },
  { type: "fill", name: "入力" }, { type: "wait", name: "待機" },
  { type: "assertVisible", name: "表示確認" }, { type: "assertText", name: "文字列確認" },
];
function newNode(type: ScenarioNode["type"], position: { x: number; y: number }): ScenarioNode {
  const base = { id: crypto.randomUUID(), label: actions.find(a => a.type === type)?.name ?? type, position };
  switch (type) {
    case "navigate": return { ...base, type, config: { url: "https://example.com" } };
    case "click": return { ...base, type, config: { locator: { strategy: "css", value: "#button" } } };
    case "fill": return { ...base, type, config: { locator: { strategy: "css", value: "#input" }, value: "" } };
    case "wait": return { ...base, type, config: { durationMs: 1000 } };
    case "assertText": return { ...base, type, config: { locator: { strategy: "css", value: "body" }, expected: "" } };
    case "assertVisible": return { ...base, type, config: { locator: { strategy: "css", value: "body" } } };
    case "start": return { ...base, type, config: {} };
    case "end": return { ...base, type, config: {} };
  }
}
export default function App() {
  const [scenario, setScenario] = useState<Scenario>(fresh);
  const initial = useMemo(() => toFlow(scenario), []); // initial state only
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingGraph = useRef<Scenario | null>(null);
  const [message, setMessage] = useState("準備完了");
  const onConnect = useCallback((c: Connection) => setEdges(es => addEdge(c, es)), [setEdges]);
  const selectedNode = scenario.nodes.find(n => n.id === selected);
  function snapshot(): Scenario {
    return { ...scenario, metadata: { ...scenario.metadata, updatedAt: stamp() },
      nodes: scenario.nodes.filter(n => nodes.some(ui => ui.id === n.id)).map(n => ({ ...n, position: nodes.find(ui => ui.id === n.id)!.position })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined })) };
  }
  function replace(s: Scenario) {
    setScenario(s); const flow = toFlow(s); setNodes(flow.nodes); setEdges(flow.edges); setSelected(null);
  }
  function add(type: ScenarioNode["type"]) {
    const n = newNode(type, { x: 120 + nodes.length * 24, y: 100 + nodes.length * 65 });
    setScenario(s => ({ ...s, nodes: [...s.nodes, n] }));
    setNodes(ns => [...ns, { id: n.id, position: n.position, data: { label: n.label } }]);
    setSelected(n.id);
  }
  function editNode(update: ScenarioNode) {
    setScenario(s => ({ ...s, nodes: s.nodes.map(n => n.id === update.id ? update : n) }));
    setNodes(ns => ns.map(n => n.id === update.id ? { ...n, data: { label: update.label } } : n));
  }
  function removeSelected() {
    if (!selectedNode) return;
    setScenario(s => ({ ...s, nodes: s.nodes.filter(n => n.id !== selected) }));
    setNodes(ns => ns.filter(n => n.id !== selected));
    setEdges(es => es.filter(e => e.source !== selected && e.target !== selected));
    setSelected(null);
  }
  async function load() {
    try {
      const p = await open({ filters: [{ name: "Scenario", extensions: ["pflow"] }] });
      if (!p || Array.isArray(p)) return;
      const s = scenarioSchema.parse(JSON.parse(await readTextFile(p)));
      replace(s); setPath(p); setMessage("読み込み完了: " + p);
    } catch (e) { setMessage("読み込み失敗: " + String(e)); }
  }
  async function persist() {
    try {
      const s = snapshot(); const errors = validateGraph(s);
      if (errors.length) { setMessage(errors.join(" / ")); return; }
      const p = path ?? await save({ defaultPath: s.metadata.name + ".pflow", filters: [{ name: "Scenario", extensions: ["pflow"] }] });
      if (!p) return;
      await writeTextFile(p, JSON.stringify(s, null, 2));
      setPath(p); setScenario(s); setMessage("保存しました: " + p);
    } catch (e) { setMessage("保存失敗: " + String(e)); }
  }
  async function exportTest() {
    try {
      const code = exportPlaywrightTest(snapshot());
      const p = await save({ defaultPath: scenario.metadata.name + ".spec.ts", filters: [{ name: "TypeScript", extensions: ["ts"] }] });
      if (!p) return;
      await writeTextFile(p, code);
      setMessage("Playwrightコードを出力しました: " + p);
    } catch (e) { setMessage("出力失敗: " + String(e)); }
  }
  function addRecorded(action: RecordedAction) {
    if (!recordingGraph.current) return;
    const next = appendRecordedAction(recordingGraph.current, action);
    recordingGraph.current = next;
    replace(next);
  }
  async function startRecording() {
    if (busy) return;
    const s = snapshot();
    recordingGraph.current = s;
    setBusy(true); setRecording(true); setLogs([]); setMessage("操作を記録中（ブラウザを閉じるか停止してください）");
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<string>("scenario-log", e => {
        try {
          const event: unknown = JSON.parse(e.payload);
          if (typeof event === "object" && event !== null && "kind" in event && event.kind === "recorded-action" && "action" in event) {
            const action = event.action as RecordedAction;
            if (action.type === "navigate" || action.type === "click" || action.type === "fill") {
              try { addRecorded(action); }
              catch (error) { setMessage("記録ノード追加失敗: " + String(error)); }
            }
            return;
          }
        } catch { /* ordinary log */ }
        setLogs(ls => [...ls, e.payload]);
      });
      await invoke("run_scenario", { scenarioJson: JSON.stringify({ ...s, settings: { ...s.settings, headless: false } }), record: true });
      setMessage("記録終了。シナリオを確認して保存してください。");
    } catch (e) { setMessage("記録終了または失敗: " + String(e)); }
    finally { unlisten?.(); recordingGraph.current = null; setBusy(false); setRecording(false); setStopping(false); }
  }
  async function run() {
    const s = snapshot();
    const errors = validateGraph(s);
    if (errors.length) { setMessage(errors.join(" / ")); return; }
    setBusy(true); setLogs([]); setMessage("実行中");
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<string>("scenario-log", e => setLogs(ls => [...ls, e.payload]));
      await invoke("run_scenario", { scenarioJson: JSON.stringify(s), record: false });
      setMessage("実行完了");
    } catch (e) { setMessage("実行失敗または停止: " + String(e)); }
    finally { unlisten?.(); setBusy(false); setStopping(false); }
  }
  async function stop() {
    if (!busy || stopping) return;
    setStopping(true); setMessage("停止処理中");
    try { await invoke("stop_scenario"); }
    catch (e) { setMessage("停止失敗: " + String(e)); setStopping(false); }
  }
  function updateSettings(patch: Partial<Scenario["settings"]>) {
    setScenario(s => ({ ...s, settings: { ...s.settings, ...patch } }));
  }
  return <div className="app">
    <header><strong>Web Test Scenario Creator</strong>
      <button disabled={busy} onClick={() => { replace(fresh()); setPath(null); setMessage("新規作成"); }}>新規</button>
      <button disabled={busy} onClick={load}>開く</button><button disabled={busy} onClick={persist}>保存</button><button disabled={busy} onClick={exportTest}>TS出力</button>
      <select aria-label="ブラウザ" disabled={busy} value={scenario.settings.browser} onChange={e => updateSettings({ browser: e.target.value as "edge" | "chromium" })}>
        <option value="edge">Edge</option><option value="chromium">Chromium</option>
      </select>
      <label><input type="checkbox" disabled={busy} checked={scenario.settings.headless} onChange={e => updateSettings({ headless: e.target.checked })}/> ヘッドレス</label>
      <button disabled={busy} onClick={run}>{busy && !recording ? "実行中…" : "▶ 実行"}</button>
      <button disabled={busy} onClick={startRecording}>{recording ? "記録中…" : "● 記録"}</button>
      <button disabled={!busy || stopping} onClick={stop}>{stopping ? "停止中…" : "■ 停止"}</button>
    </header>
    <main>
      <aside><h3>シナリオ</h3>
        <input aria-label="シナリオ名" value={scenario.metadata.name} onChange={e => setScenario(s => ({ ...s, metadata: { ...s.metadata, name: e.target.value } }))}/>
        <h3>ノード追加</h3>{actions.map(a => <button className="palette" key={a.type} disabled={busy} onClick={() => add(a.type)}>＋ {a.name}</button>)}
        <p>ノードの端からドラッグして接続してください。</p>
      </aside>
      <section><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, n) => setSelected(n.id)} onPaneClick={() => setSelected(null)} fitView><Background/><Controls/><MiniMap/></ReactFlow></section>
      <aside className="inspector"><h3>ノード設定</h3>{selectedNode ? <>
        <label>表示名<input value={selectedNode.label} onChange={e => editNode({ ...selectedNode, label: e.target.value })}/></label>
        {selectedNode.type === "navigate" && <label>URL<input value={selectedNode.config.url} onChange={e => editNode({ ...selectedNode, config: { url: e.target.value } })}/></label>}
        {(selectedNode.type === "click" || selectedNode.type === "fill" || selectedNode.type === "assertVisible" || selectedNode.type === "assertText") && <>
          <label>Locator方式<select value={selectedNode.config.locator.strategy} onChange={e => {
            const locator = e.target.value === "role" ? { strategy: "role" as const, role: "button" } : { strategy: e.target.value as "css" | "testId" | "text", value: "" };
            editNode({ ...selectedNode, config: { ...selectedNode.config, locator } } as ScenarioNode);
          }}><option value="css">CSS</option><option value="testId">Test ID</option><option value="text">テキスト</option><option value="role">Role</option></select></label>
          <label>Locator値<input value={selectedNode.config.locator.strategy === "role" ? selectedNode.config.locator.role : selectedNode.config.locator.value} onChange={e => {
            const l = selectedNode.config.locator;
            const locator = l.strategy === "role" ? { ...l, role: e.target.value } : { ...l, value: e.target.value };
            editNode({ ...selectedNode, config: { ...selectedNode.config, locator } } as ScenarioNode);
          }}/></label>
        </>}
        {selectedNode.type === "assertText" && <label>期待する文字列<input value={selectedNode.config.expected} onChange={e => editNode({ ...selectedNode, config: { ...selectedNode.config, expected: e.target.value } })}/></label>}
        {selectedNode.type === "fill" && <label>入力値<input value={selectedNode.config.value} onChange={e => editNode({ ...selectedNode, config: { ...selectedNode.config, value: e.target.value } })}/></label>}
        {selectedNode.type === "wait" && <label>待機ミリ秒<input type="number" min={0} value={selectedNode.config.durationMs} onChange={e => editNode({ ...selectedNode, config: { durationMs: Number(e.target.value) } })}/></label>}
        <button disabled={busy} onClick={removeSelected}>ノード削除</button>
      </> : <p>ノードを選択してください。</p>}</aside>
    </main>
    <div className="logs"><strong>実行ログ</strong><pre>{logs.join("\n") || "実行するとログが表示されます。"}</pre></div>
    <footer>{message}</footer>
  </div>;
}
