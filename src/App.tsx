import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, type Connection, type Node, type Edge, type NodeChange, type EdgeChange, SelectionMode, useReactFlow, ReactFlowProvider } from "@xyflow/react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { exportPlaywrightTest } from "../packages/engine/src/export";
import { exportSeleniumTest } from "../packages/engine/src/export-selenium";
import type { RecordedAction } from "../packages/playwright-adapter/src/record";
import { appendRecordedAction } from "../packages/playwright-adapter/src/record-graph";
import { listen } from "@tauri-apps/api/event";
import { scenarioSchema, validateGraph, type Scenario, type ScenarioNode } from "../packages/schema/src/scenario";
import { ScenarioFlowNode, nodeDetail } from "./components/ScenarioFlowNode";
import { ScenarioHome } from "./components/ScenarioHome";
import { ScenarioDebugger } from "./components/ScenarioDebugger";

const nodeTypes = { scenario: ScenarioFlowNode };

const stamp = () => new Date().toISOString();
function fresh(): Scenario {
  return { schemaVersion: "1.0", metadata: { id: crypto.randomUUID(), name: "新しいシナリオ", createdAt: stamp(), updatedAt: stamp() }, settings: { browser: "edge", headless: false, timeoutMs: 10000, viewport: { width: 1280, height: 720 } }, variables: {}, nodes: [
    { id: crypto.randomUUID(), type: "start", label: "開始", position: { x: 120, y: 100 }, config: {} },
    { id: crypto.randomUUID(), type: "end", label: "終了", position: { x: 120, y: 300 }, config: {} },
  ], edges: [] };
}
function toFlow(s: Scenario): { nodes: Node[]; edges: Edge[] } {
  return { nodes: s.nodes.map(n => ({ id: n.id, position: n.position, data: { label: n.label, kind: n.type, detail: nodeDetail(n) }, type: "scenario" })), edges: s.edges.map(e => ({ ...e })) };
}
const actions: { type: ScenarioNode["type"]; name: string }[] = [
  { type: "navigate", name: "URL移動" }, { type: "click", name: "クリック" },
  { type: "fill", name: "入力" }, { type: "wait", name: "待機" },
  { type: "condition", name: "条件分岐" },
  { type: "assertVisible", name: "表示確認" }, { type: "assertText", name: "文字列確認" },
];
function newNode(type: ScenarioNode["type"], position: { x: number; y: number }): ScenarioNode {
  const base = { id: crypto.randomUUID(), label: actions.find(a => a.type === type)?.name ?? type, position };
  switch (type) {
    case "navigate": return { ...base, type, config: { url: "https://example.com" } };
    case "click": return { ...base, type, config: { locator: { strategy: "css", value: "#button" } } };
    case "fill": return { ...base, type, config: { locator: { strategy: "css", value: "#input" }, value: "" } };
    case "wait": return { ...base, type, config: { durationMs: 1000 } };
    case "condition": return { ...base, type, config: { locator: { strategy: "css", value: "body" }, check: "visible" } };
    case "assertText": return { ...base, type, config: { locator: { strategy: "css", value: "body" }, expected: "" } };
    case "assertVisible": return { ...base, type, config: { locator: { strategy: "css", value: "body" } } };
    case "start": return { ...base, type, config: {} };
    case "end": return { ...base, type, config: {} };
  }
}
function Editor() {
  const flow = useReactFlow();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("scenario-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* storage unavailable */ }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  function changeTheme(value: "light" | "dark") {
    setTheme(value);
    try { localStorage.setItem("scenario-theme", value); } catch { /* storage unavailable */ }
  }
  const [screen, setScreen] = useState<"home" | "editor" | "debug">("home");
  const [directory, setDirectory] = useState(() => {
    try { return localStorage.getItem("scenario-directory") ?? ""; } catch { return ""; }
  });
  function changeDirectory(next: string) {
    setDirectory(next);
    setPath(null);
    replace(fresh());
    setUndoStack([]);
    setRedoStack([]);
    setNodeStatus({});
    setLogs([]);
    try { localStorage.setItem("scenario-directory", next); } catch { /* unavailable */ }
  }
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; position: { x: number; y: number }; nodeId?: string; edgeId?: string } | null>(null);
  const [scenario, setScenario] = useState<Scenario>(fresh);
  const initial = useMemo(() => toFlow(scenario), []); // initial state only
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<"playwright" | "selenium">("playwright");
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [pausedNode, setPausedNode] = useState<string | null>(null);
  const [nodeStatus, setNodeStatus] = useState<Record<string, "running" | "passed" | "failed" | "paused">>({});
  const recordingGraph = useRef<Scenario | null>(null);
  const [message, setMessage] = useState("準備完了");
  const [undoStack, setUndoStack] = useState<Scenario[]>([]);
  const [redoStack, setRedoStack] = useState<Scenario[]>([]);
  const clipboard = useRef<{ nodes: ScenarioNode[]; edges: Scenario["edges"] }>({ nodes: [], edges: [] });
  const lastPaste = useRef(0);
  const historyLock = useRef(false);
  const dragStartPositions = useRef<Map<string, { x: number; y: number }> | null>(null);
  const dragRedoBackup = useRef<Scenario[]>([]);
  function checkpoint() {
    if (historyLock.current) return;
    const state = snapshot();
    setUndoStack(stack => [...stack.slice(-99), state]);
    setRedoStack([]);
  }
  function restore(state: Scenario) {
    historyLock.current = true;
    replace(state);
    queueMicrotask(() => { historyLock.current = false; });
  }
  function undo() {
    if (busy || !undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(stack => stack.slice(0, -1));
    setRedoStack(stack => [...stack, snapshot()]);
    restore(previous);
    setMessage("元に戻しました");
  }
  function redo() {
    if (busy || !redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(stack => stack.slice(0, -1));
    setUndoStack(stack => [...stack, snapshot()]);
    restore(next);
    setMessage("やり直しました");
  }
  function copySelected() {
    const selectedIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
    if (selectedIds.size === 0 && selected) selectedIds.add(selected);
    const copied = snapshot().nodes.filter(n => selectedIds.has(n.id) && n.type !== "start" && n.type !== "end");
    if (!copied.length) { setMessage("コピー可能なノードを選択してください"); return; }
    const ids = new Set(copied.map(node => node.id));
    clipboard.current = { nodes: structuredClone(copied), edges: structuredClone(snapshot().edges.filter(edge => ids.has(edge.source) && ids.has(edge.target))) };
    lastPaste.current = 0;
    setMessage(copied.length + "個のノードと内部の接続をコピーしました");
  }
  function paste() {
    if (busy || !clipboard.current.nodes.length) return;
    checkpoint();
    lastPaste.current++;
    const offset = lastPaste.current * 36;
    const idMap = new Map(clipboard.current.nodes.map(node => [node.id, crypto.randomUUID()]));
    const copies = clipboard.current.nodes.map(n => ({ ...structuredClone(n), id: idMap.get(n.id)!, position: { x: n.position.x + offset, y: n.position.y + offset } }));
    const copiedEdges = clipboard.current.edges.map(edge => ({ ...structuredClone(edge), id: crypto.randomUUID(), source: idMap.get(edge.source)!, target: idMap.get(edge.target)! }));
    setScenario(s => ({ ...s, nodes: [...s.nodes, ...copies], edges: [...s.edges, ...copiedEdges] }));
    setNodes(ns => [...ns.map(n => ({ ...n, selected: false })), ...toFlow({ ...scenario, nodes: copies, edges: [] }).nodes.map(n => ({ ...n, selected: true }))]);
    setEdges(es => [...es.map(edge => ({ ...edge, selected: false })), ...copiedEdges]);
    setSelected(copies.length === 1 ? copies[0].id : null);
    setMessage(copies.length + "個のノードを貼り付けました");
  }
  const onConnect = useCallback((connection: Connection) => {
    const source = scenario.nodes.find(node => node.id === connection.source);
    const target = scenario.nodes.find(node => node.id === connection.target);
    if (!source || !target || source.id === target.id || source.type === "end" || target.type === "start") {
      setMessage("接続できません：開始・終了ノードの方向と接続先を確認してください");
      return;
    }
    const handle = connection.sourceHandle ?? null;
    if (source.type === "condition" && handle !== "true" && handle !== "false") {
      setMessage("条件分岐はYESまたはNOから接続してください");
      return;
    }
    if (edges.some(edge => edge.source === source.id && (edge.sourceHandle ?? null) === handle)) {
      setMessage("この出力には既に接続があります。接続線を削除してから接続してください");
      return;
    }
    checkpoint();
    const edge: Edge = {
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    };
    setEdges(existing => addEdge(edge, existing));
    setScenario(current => ({ ...current, edges: [...current.edges, edge] }));
    setMessage("ノードを接続しました");
  }, [scenario, nodes, edges]);
  function removeObjects(nodeIds: string[], edgeIds: string[] = []) {
    const removable = new Set(nodeIds.filter(id => scenario.nodes.some(n => n.id === id && n.type !== "start" && n.type !== "end")));
    const removeEdges = new Set(edgeIds);
    if (!removable.size && !removeEdges.size) { setMessage("削除可能なオブジェクトがありません（開始・終了ノードは保護されています）"); return; }
    checkpoint();
    setScenario(s => ({ ...s, nodes: s.nodes.filter(n => !removable.has(n.id)), edges: s.edges.filter(e => !removable.has(e.source) && !removable.has(e.target) && !removeEdges.has(e.id)) }));
    setNodes(ns => ns.filter(n => !removable.has(n.id)));
    setEdges(es => es.filter(e => !removable.has(e.source) && !removable.has(e.target) && !removeEdges.has(e.id)));
    if (selected && removable.has(selected)) setSelected(null);
    setMessage("選択したオブジェクトを削除しました");
  }
  function deleteSelection() {
    const nodeIds = nodes.filter(n => n.selected).map(n => n.id);
    if (nodeIds.length === 0 && selected) nodeIds.push(selected);
    removeObjects(nodeIds, edges.filter(e => e.selected).map(e => e.id));
  }
  function openContextMenu(event: { preventDefault(): void; clientX: number; clientY: number }, nodeId?: string, edgeId?: string) {
    event.preventDefault();
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 232)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 405)),
      position: flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      nodeId, edgeId,
    });
  }
  function startNodeDrag() {
    dragStartPositions.current = new Map(nodes.map(node => [node.id, { ...node.position }]));
    dragRedoBackup.current = redoStack;
    checkpoint();
  }
  function endNodeDrag(_event: unknown, draggedNode: Node, draggedNodes: Node[]) {
    const before = dragStartPositions.current;
    dragStartPositions.current = null;
    if (!before) return;
    // React Flowの終了イベントに渡される座標を使用し、Reactのstate反映待ちを避ける。
    const moved = [draggedNode, ...draggedNodes].some(node => {
      const original = before.get(node.id);
      return original && (original.x !== node.position.x || original.y !== node.position.y);
    });
    if (!moved) {
      setUndoStack(stack => stack.slice(0, -1));
      setRedoStack(dragRedoBackup.current);
    } else {
      setMessage("ノードの移動を記録しました（Ctrl+Zで元に戻せます）");
    }
  }
  function changeNodes(changes: NodeChange<Node>[]) {
    const allowed = changes.filter(change => change.type !== "remove" ||
      !scenario.nodes.some(node => node.id === change.id && (node.type === "start" || node.type === "end")));
    if (allowed.some(change => change.type === "remove")) {
      checkpoint();
      const removed = new Set(allowed.filter(change => change.type === "remove").map(change => change.id));
      setScenario(current => ({
        ...current,
        nodes: current.nodes.filter(node => !removed.has(node.id)),
        edges: current.edges.filter(edge => !removed.has(edge.source) && !removed.has(edge.target)),
      }));
      setEdges(current => current.filter(edge => !removed.has(edge.source) && !removed.has(edge.target)));
      if (selected && removed.has(selected)) setSelected(null);
    }
    onNodesChange(allowed);
  }
  function changeEdges(changes: EdgeChange<Edge>[]) {
    if (changes.some(change => change.type === "remove")) {
      checkpoint();
      const removed = new Set(changes.filter(change => change.type === "remove").map(change => change.id));
      setScenario(current => ({ ...current, edges: current.edges.filter(edge => !removed.has(edge.id)) }));
    }
    onEdgesChange(changes);
  }
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "Escape") { setContextMenu(null); return; }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "Delete" || e.key === "Backspace") && screen === "editor" && !busy) {
        e.preventDefault(); deleteSelection(); return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey || screen !== "editor") return;
      const key = e.key.toLowerCase();
      if (key === "s") { e.preventDefault(); if (!busy) void persist(); }
      else if (key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (key === "y") { e.preventDefault(); redo(); }
      else if (key === "c") { e.preventDefault(); copySelected(); }
      else if (key === "v") { e.preventDefault(); paste(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  const selectedNode = scenario.nodes.find(n => n.id === selected);
  function snapshot(): Scenario {
    return { ...scenario, metadata: { ...scenario.metadata, updatedAt: stamp() },
      nodes: scenario.nodes.filter(n => nodes.some(ui => ui.id === n.id)).map(n => ({ ...n, position: nodes.find(ui => ui.id === n.id)!.position })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined })) };
  }
  function replace(s: Scenario) {
    setScenario(s); const flow = toFlow(s); setNodes(flow.nodes); setEdges(flow.edges); setSelected(null);
  }
  function add(type: ScenarioNode["type"], at?: { x: number; y: number }) {
    setContextMenu(null);
    checkpoint();
    const viewport = document.querySelector(".canvas .react-flow")?.getBoundingClientRect();
    const center = viewport
      ? flow.screenToFlowPosition({ x: viewport.left + viewport.width / 2, y: viewport.top + viewport.height / 2 })
      : { x: 300, y: 200 };
    const offset = (nodes.length % 4) * 24;
    const n = newNode(type, at ? { x: at.x - 86, y: at.y - 35 } : { x: center.x - 86 + offset, y: center.y - 40 + offset });
    setScenario(s => ({ ...s, nodes: [...s.nodes, n] }));
    setNodes(ns => [...ns, { id: n.id, position: n.position, data: { label: n.label, kind: n.type, detail: nodeDetail(n) }, type: "scenario" }]);
    setSelected(n.id);
  }
  function editNode(update: ScenarioNode) {
    if (busy) return;
    checkpoint();
    setScenario(s => ({ ...s, nodes: s.nodes.map(n => n.id === update.id ? update : n) }));
    setNodes(ns => ns.map(n => n.id === update.id ? { ...n, data: { label: update.label, kind: update.type, detail: nodeDetail(update) } } : n));
  }
  function removeSelected() {
    if (selectedNode) removeObjects([selectedNode.id]);
  }
  async function openScenarioAt(filePath: string) {
    const contents = await invoke<string>("read_scenario_file", { path: filePath });
    const loaded = scenarioSchema.parse(JSON.parse(contents));
    replace(loaded);
    setUndoStack([]); setRedoStack([]);
    setPath(filePath);
    setNodeStatus({});
    setLogs([]);
    setMessage("読み込み完了: " + filePath);
  }
  async function load() {
    try {
      const p = await open({ filters: [{ name: "Scenario", extensions: ["pflow"] }] });
      if (!p || Array.isArray(p)) return;
      await openScenarioAt(p);
    } catch (e) { setMessage("読み込み失敗: " + String(e)); }
  }
  async function persist() {
    try {
      const s = snapshot(); const errors = validateGraph(s);
      if (errors.length) { setMessage(errors.join(" / ")); return; }
      const p = path ?? await save({ defaultPath: s.metadata.name + ".pflow", filters: [{ name: "Scenario", extensions: ["pflow"] }] });
      if (!p) return;
      await invoke("write_scenario_file", { path: p, content: JSON.stringify(s, null, 2) });
      setPath(p); setScenario(s); setMessage("保存しました: " + p);
    } catch (e) { setMessage("保存失敗: " + String(e)); }
  }
  async function exportTest() {
    try {
      const isSelenium = exportTarget === "selenium";
      const code = isSelenium ? exportSeleniumTest(snapshot()) : exportPlaywrightTest(snapshot());
      const extension = isSelenium ? "mjs" : "ts";
      const p = await save({ defaultPath: scenario.metadata.name + (isSelenium ? ".selenium.mjs" : ".spec.ts"), filters: [{ name: isSelenium ? "JavaScript ES Module" : "TypeScript", extensions: [extension] }] });
      if (!p) return;
      await writeTextFile(p, code);
      setMessage((isSelenium ? "Selenium" : "Playwright") + "コードを出力しました: " + p);
    } catch (e) { setMessage("出力失敗: " + String(e)); }
  }
  function addRecorded(action: RecordedAction) {
    if (!recordingGraph.current) return;
    const next = appendRecordedAction(recordingGraph.current, action);
    recordingGraph.current = next;
    replace(next);
  }
  const stopRequested = useRef(false);
  async function startRecording() {
    if (busy) return;
    const s = snapshot();
    recordingGraph.current = s;
    stopRequested.current = false;
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
      setMessage(stopRequested.current ? "記録を停止しました。シナリオを確認して保存してください。" : "記録終了。シナリオを確認して保存してください。");
    } catch (e) { setMessage(stopRequested.current ? "記録を停止しました: " + String(e) : "記録失敗: " + String(e)); }
    finally { unlisten?.(); recordingGraph.current = null; setBusy(false); setRecording(false); setStopping(false); }
  }
  async function run(debug = false) {
    const s = snapshot();
    const errors = validateGraph(s);
    if (errors.length) { setMessage(errors.join(" / ")); return; }
    stopRequested.current = false;
    setBusy(true); setDebugging(debug); setPausedNode(null); setNodeStatus({}); setLogs([]); setMessage(debug ? "デバッグ開始中" : "実行中");
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<string>("scenario-log", e => {
        setLogs(ls => [...ls, e.payload]);
        try {
          const event = JSON.parse(e.payload) as { type?: string; nodeId?: string; message?: string };
          if (event.nodeId && event.type === "node.paused") {
            setPausedNode(event.nodeId);
            setNodeStatus(status => ({ ...status, [event.nodeId!]: "paused" }));
            setMessage("一時停止中: 次のステップを実行できます");
          } else if (event.nodeId && event.type === "node.started") {
            setPausedNode(null);
            setNodeStatus(status => ({ ...status, [event.nodeId!]: "running" }));
          } else if (event.nodeId && event.type === "node.completed") {
            setNodeStatus(status => ({ ...status, [event.nodeId!]: "passed" }));
          } else if (event.nodeId && event.type === "node.failed") {
            setNodeStatus(status => ({ ...status, [event.nodeId!]: "failed" }));
            setMessage("ノード失敗: " + (event.message ?? ""));
          }
        } catch { /* non-JSON log */ }
      });
      await invoke("run_scenario", { scenarioJson: JSON.stringify(s), record: false, debug });
      setMessage(stopRequested.current ? "実行を停止しました" : "実行完了");
    } catch (e) { setMessage(stopRequested.current ? "実行を停止しました: " + String(e) : "実行失敗: " + String(e)); }
    finally { unlisten?.(); setBusy(false); setStopping(false); setDebugging(false); setPausedNode(null); }
  }
  async function debugCommand(command: "STEP" | "CONTINUE") {
    if (!debugging || !pausedNode) return;
    try {
      setPausedNode(null);
      await invoke("debug_control", { command });
      setMessage(command === "STEP" ? "1ステップ実行中" : "連続実行中");
    } catch (e) { setMessage("デバッグ操作失敗: " + String(e)); }
  }
  async function stop() {
    if (!busy || stopping) return;
    setStopping(true); setMessage("停止処理中");
    try { await invoke("stop_scenario"); stopRequested.current = true; }
    catch (e) { setMessage("停止失敗: " + String(e)); setStopping(false); }
  }
  function updateSettings(patch: Partial<Scenario["settings"]>) {
    if (busy) return;
    checkpoint();
    setScenario(s => ({ ...s, settings: { ...s.settings, ...patch } }));
  }
  const [logHeight, setLogHeight] = useState(154);
  const resizeLogs = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = logHeight;
    const move = (e: PointerEvent) => setLogHeight(Math.max(72, Math.min(window.innerHeight * 0.55, startHeight + startY - e.clientY)));
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }, [logHeight]);
  const displayNodes = nodes.map(n => ({ ...n, className: nodeStatus[n.id] ? "debug-node debug-node--" + nodeStatus[n.id] : undefined }));
  function createScenario() {
    replace(fresh()); setPath(null); setUndoStack([]); setRedoStack([]); setNodeStatus({}); setLogs([]); setScreen("editor"); setMessage("新しいシナリオ");
  }
  return <div className="app" data-theme={theme}>
    <header className="studio-header">
      <strong className="studio-brand">◇ Scenario Studio</strong>
      <nav className="studio-tabs" aria-label="画面切り替え">
        <button className={screen === "home" ? "active" : ""} aria-current={screen === "home" ? "page" : undefined} disabled={busy} onClick={() => setScreen("home")}>⌂ TOP</button>
        <button className={screen === "editor" ? "active" : ""} aria-current={screen === "editor" ? "page" : undefined} disabled={busy} onClick={() => setScreen("editor")}>✎ 編集</button>
        <button className={screen === "debug" ? "active" : ""} aria-current={screen === "debug" ? "page" : undefined} disabled={busy} onClick={() => setScreen("debug")}>◇ デバッグ</button>
      </nav>
      <div className="studio-header-actions">
        {screen === "home" && <>
          <button disabled={busy} onClick={createScenario}>＋ 新規</button>
          <button disabled={busy} onClick={load}>↗ 開く</button>
        </>}
        {screen === "editor" && <>
          <button disabled={busy || !undoStack.length} onClick={undo} title="Ctrl+Z">↶ 元に戻す</button>
          <button disabled={busy || !redoStack.length} onClick={redo} title="Ctrl+Y / Ctrl+Shift+Z">↷ やり直す</button>
          <button disabled={busy} onClick={copySelected} title="Ctrl+C">コピー</button>
          <button disabled={busy || !clipboard.current.nodes.length} onClick={paste} title="Ctrl+V">貼り付け</button>
          <button disabled={busy} onClick={persist} title="Ctrl+S">保存</button>
          <label>コード出力先 <select aria-label="コード出力先" value={exportTarget} disabled={busy} onChange={e => setExportTarget(e.target.value as "playwright" | "selenium")}><option value="playwright">Playwright (TypeScript)</option><option value="selenium">Selenium (JavaScript)</option></select></label>
          <button disabled={busy} onClick={exportTest}>コード出力</button>
          <button className="record-button" disabled={busy} onClick={startRecording}>{recording ? "記録中…" : "● 記録"}</button>
          <button className="run-button" disabled={busy} onClick={() => run(false)}>▶ 実行</button>
          <button disabled={busy} onClick={() => setScreen("debug")}>🐞 デバッグ</button>
          {busy && <button className="stop-button" disabled={stopping} onClick={stop}>■ 停止</button>}
        </>}
        {screen !== "debug" && <div className="runtime-settings">
          <select aria-label="ブラウザ" disabled={busy} value={scenario.settings.browser} onChange={e => updateSettings({ browser: e.target.value as "edge" | "chromium" })}>
            <option value="edge">Edge</option><option value="chromium">Chromium</option>
          </select>
          <label className="headless-switch" title="ブラウザの画面を表示せずに実行">
            <input type="checkbox" disabled={busy} checked={scenario.settings.headless} onChange={e => updateSettings({ headless: e.target.checked })}/>
            <span className="switch-track" aria-hidden="true"/><span>ヘッドレス</span>
          </label>
        </div>}
        <button className="theme-icon-button" aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"} title={theme === "dark" ? "ライトモード" : "ダークモード"} onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "☾"}</button>
      </div>
    </header>
    {screen === "home" ? <ScenarioHome directory={directory} onDirectoryChange={changeDirectory} selectedPath={path} scenario={scenario} busy={busy} message={message} logs={logs} errors={validateGraph(snapshot())} onSelect={filePath => { if (!busy) void openScenarioAt(filePath).catch(e => setMessage("読み込み失敗: " + String(e))); }} onNew={createScenario} onOpen={() => { void load(); }} onEdit={() => setScreen("editor")} onDebug={() => setScreen("debug")} onRun={() => { void run(false); }} onStop={() => { void stop(); }}/> : screen === "debug" ? <ScenarioDebugger scenario={snapshot()} nodes={nodes} edges={edges} nodeStatus={nodeStatus} pausedNode={pausedNode} busy={busy} debugging={debugging} stopping={stopping} logs={logs} message={message} theme={theme} onStart={() => { void run(true); }} onStep={() => { void debugCommand("STEP"); }} onContinue={() => { void debugCommand("CONTINUE"); }} onStop={() => { void stop(); }} onEdit={() => setScreen("editor")} onHome={() => setScreen("home")}/> : <>
    <main className="editor-layout">
      <aside className="sidebar"><div className="panel-kicker">WORKSPACE</div><h3>シナリオ</h3>
        <input aria-label="シナリオ名" value={scenario.metadata.name} onChange={e => { checkpoint(); setScenario(s => ({ ...s, metadata: { ...s.metadata, name: e.target.value } })); }}/>
        <div className="panel-kicker">BUILD</div><h3>ノード追加</h3>{actions.map(a => <button className="palette" key={a.type} disabled={busy} onClick={() => add(a.type)}>＋ {a.name}</button>)}
        <p>左ドラッグで範囲選択、選択ノードをまとめて移動。右クリックでノードの追加や削除ができます。</p>
      </aside>
      <section className="canvas"><div className="canvas-heading"><span className="canvas-dot"/> フローチャート <span className="canvas-count">{nodes.length} ノード · {edges.length} 接続</span></div><ReactFlow colorMode={theme} nodeTypes={nodeTypes} nodes={displayNodes} edges={edges} nodesDraggable={!busy} nodesConnectable={!busy} elementsSelectable={!busy} onNodesChange={busy ? undefined : changeNodes} onEdgesChange={busy ? undefined : changeEdges} onNodeDragStart={busy ? undefined : startNodeDrag} onNodeDragStop={busy ? undefined : endNodeDrag} onConnect={busy ? undefined : onConnect} onPaneClick={() => { setSelected(null); setContextMenu(null); }} onPaneContextMenu={event => openContextMenu(event)} onNodeContextMenu={(event, node) => { setSelected(node.id); openContextMenu(event, node.id); }} onEdgeContextMenu={(event, edge) => openContextMenu(event, undefined, edge.id)} onNodeClick={(_, n) => { setSelected(n.id); setContextMenu(null); }} onEdgeClick={() => { setSelected(null); setContextMenu(null); }} selectionOnDrag selectionMode={SelectionMode.Partial} panOnDrag={[1]} deleteKeyCode={null} fitView fitViewOptions={{ maxZoom: 0.82, padding: 0.2 }} minZoom={0.25}><Background/><Controls/><MiniMap/></ReactFlow></section>
      <aside className="inspector"><div className="panel-kicker">PROPERTIES</div><h3>ノード設定</h3><fieldset disabled={busy} className="inspector-fields">{selectedNode ? <>
        <label>表示名<input value={selectedNode.label} onChange={e => editNode({ ...selectedNode, label: e.target.value })}/></label>
        {selectedNode.type === "navigate" && <label>URL<input value={selectedNode.config.url} onChange={e => editNode({ ...selectedNode, config: { url: e.target.value } })}/></label>}
        {(selectedNode.type === "click" || selectedNode.type === "fill" || selectedNode.type === "assertVisible" || selectedNode.type === "assertText" || selectedNode.type === "condition") && <>
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
        {selectedNode.type === "condition" && <><label>条件<select aria-label="条件" value={selectedNode.config.check} onChange={e => editNode({ ...selectedNode, config: { ...selectedNode.config, check: e.target.value as "visible" | "textContains" } })}><option value="visible">表示されている</option><option value="textContains">文字列を含む</option></select></label>{selectedNode.config.check === "textContains" && <label>比較文字列<input aria-label="比較文字列" value={selectedNode.config.expected ?? ""} onChange={e => editNode({ ...selectedNode, config: { ...selectedNode.config, expected: e.target.value } })}/></label>}<p>左の YES と右の NO から、それぞれ次のノードに接続してください。</p></>}
        {selectedNode.type === "assertText" && <label>期待する文字列<input value={selectedNode.config.expected} onChange={e => editNode({ ...selectedNode, config: { ...selectedNode.config, expected: e.target.value } })}/></label>}
        {selectedNode.type === "fill" && <label>入力値<input value={selectedNode.config.value} onChange={e => editNode({ ...selectedNode, config: { ...selectedNode.config, value: e.target.value } })}/></label>}
        {selectedNode.type === "wait" && <label>待機ミリ秒<input type="number" min={0} value={selectedNode.config.durationMs} onChange={e => editNode({ ...selectedNode, config: { durationMs: Number(e.target.value) } })}/></label>}
        <label className="screenshot-option"><input type="checkbox" aria-label="スクリーンショットを撮影" checked={selectedNode.screenshot ?? false} onChange={e => editNode({ ...selectedNode, screenshot: e.target.checked })}/> 実行後にスクリーンショットを撮影</label>
        <button disabled={busy} onClick={removeSelected}>ノード削除</button>
      </> : <p>ノードを選択してください。</p>}</fieldset></aside>
    </main>
    {contextMenu && <div className="flow-context-menu" role="menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseDown={event => event.stopPropagation()}>
      <div className="context-menu-heading">ノードを追加</div>
      {actions.map(action => <button role="menuitem" key={action.type} onClick={() => { add(action.type, contextMenu.position); setContextMenu(null); }}>ノード › {action.name}</button>)}
      {(contextMenu.nodeId || contextMenu.edgeId) && <><div className="context-menu-divider"/><button role="menuitem" onClick={() => { removeObjects(contextMenu.nodeId ? [contextMenu.nodeId] : [], contextMenu.edgeId ? [contextMenu.edgeId] : []); setContextMenu(null); }}>削除</button></>}
    </div>}
    <div className="logs" style={{ height: logHeight }}><div className="log-resize" role="separator" aria-label="ログ表示の高さを変更" aria-orientation="horizontal" tabIndex={0} onPointerDown={resizeLogs} onKeyDown={e => { if (e.key === "ArrowUp") setLogHeight(h => Math.min(window.innerHeight * .55, h + 24)); if (e.key === "ArrowDown") setLogHeight(h => Math.max(72, h - 24)); }}><span /></div><strong><span className="log-indicator"/> 実行ログ</strong><pre>{logs.join("\n") || "実行するとログが表示されます。"}</pre></div>
    </>}
    <footer>{message}</footer>
  </div>;
}

export default function App() { return <ReactFlowProvider><Editor /></ReactFlowProvider>; }
