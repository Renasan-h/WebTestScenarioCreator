import { useCallback, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, type Connection } from "@xyflow/react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { scenarioSchema, validateGraph, type Scenario } from "../packages/schema/src/scenario";

const initial: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: crypto.randomUUID(), name: "新しいシナリオ", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  settings: { browser: "edge", headless: false, timeoutMs: 10000, viewport: { width: 1280, height: 720 } },
  variables: {},
  nodes: [
    { id: "start", type: "start", label: "開始", position: { x: 80, y: 80 }, config: {} },
    { id: "end", type: "end", label: "終了", position: { x: 80, y: 270 }, config: {} }
  ],
  edges: [{ id: "start-end", source: "start", target: "end" }]
};
function toFlow(s: Scenario) {
  return { nodes: s.nodes.map(n => ({ id: n.id, position: n.position, data: { label: n.label }, type: "default" })), edges: s.edges };
}
export default function App() {
  const [scenario, setScenario] = useState<Scenario>(initial);
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlow(initial).nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlow(initial).edges);
  const [message, setMessage] = useState("準備完了");
  const onConnect = useCallback((c: Connection) => setEdges(es => addEdge(c, es)), [setEdges]);
  function current(): Scenario {
    return { ...scenario, metadata: { ...scenario.metadata, updatedAt: new Date().toISOString() },
      nodes: scenario.nodes.map(n => { const ui = nodes.find(x => x.id === n.id); return ui ? { ...n, position: ui.position } : n; }),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined })) };
  }
  async function load() {
    try {
      const path = await open({ filters: [{ name: "Scenario", extensions: ["pflow"] }] });
      if (!path || Array.isArray(path)) return;
      const s = scenarioSchema.parse(JSON.parse(await readTextFile(path)));
      setScenario(s); const f = toFlow(s); setNodes(f.nodes); setEdges(f.edges); setMessage("読み込み完了: " + path);
    } catch (e) { setMessage("読み込み失敗: " + String(e)); }
  }
  async function persist() {
    try {
      const s = current(); const errors = validateGraph(s);
      if (errors.length) { setMessage(errors.join(" / ")); return; }
      const path = await save({ defaultPath: s.metadata.name + ".pflow", filters: [{ name: "Scenario", extensions: ["pflow"] }] });
      if (!path) return;
      await writeTextFile(path, JSON.stringify(s, null, 2)); setScenario(s); setMessage("保存しました: " + path);
    } catch (e) { setMessage("保存失敗: " + String(e)); }
  }
  return <div className="app"><header><strong>Web Test Scenario Creator</strong><button onClick={load}>開く</button><button onClick={persist}>保存</button><select value={scenario.settings.browser} onChange={e => setScenario(s => ({ ...s, settings: { ...s.settings, browser: e.target.value as "edge" | "chromium" } }))}><option value="edge">Edge</option><option value="chromium">Chromium</option></select><span>Phase 1・2</span></header><main><aside><h3>シナリオ</h3><input aria-label="シナリオ名" value={scenario.metadata.name} onChange={e => setScenario(s => ({ ...s, metadata: { ...s.metadata, name: e.target.value } }))}/><p>ノードの配置と接続、JSON保存・読込に対応しています。</p><p>実行ボタンと詳細設定は次の実装対象です。</p></aside><section><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView><Background/><Controls/><MiniMap/></ReactFlow></section></main><footer>{message}</footer></div>;
}
