import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from "@xyflow/react";
import type { Scenario } from "../../packages/schema/src/scenario";
import { ScenarioFlowNode } from "./ScenarioFlowNode";

const nodeTypes = { scenario: ScenarioFlowNode };
type Status = "running" | "passed" | "failed" | "paused";
type Props = {
  scenario: Scenario;
  nodes: Node[];
  edges: Edge[];
  nodeStatus: Record<string, Status>;
  pausedNode: string | null;
  busy: boolean;
  debugging: boolean;
  stopping: boolean;
  logs: string[];
  message: string;
  theme: "light" | "dark";
  onStart: () => void;
  onStep: () => void;
  onContinue: () => void;
  onStop: () => void;
  onEdit: () => void;
  onHome: () => void;
};

export function ScenarioDebugger({ scenario, nodes, edges, nodeStatus, pausedNode, busy, debugging, stopping, logs, message, theme, onStart, onStep, onContinue, onStop, onEdit, onHome }: Props) {
  const counts = useMemo(() => ({
    passed: Object.values(nodeStatus).filter(s => s === "passed").length,
    failed: Object.values(nodeStatus).filter(s => s === "failed").length,
  }), [nodeStatus]);
  const activeNodeId = pausedNode ?? scenario.nodes.find(node => nodeStatus[node.id] === "running")?.id;
  const currentNode = scenario.nodes.find(node => node.id === activeNodeId);
  const completedCount = counts.passed + counts.failed;
  const progressPercent = scenario.nodes.length ? Math.round(completedCount / scenario.nodes.length * 100) : 0;
  const displayNodes = nodes.map(node => ({ ...node, className: nodeStatus[node.id] ? "debug-node debug-node--" + nodeStatus[node.id] : "" }));
  const labels: Record<Status, string> = { paused: "待機中", running: "実行中", passed: "成功", failed: "失敗" };

  return <main className="debug-layout" aria-label="デバッグ画面">
    <div className="debug-topbar">
      <div><div className="panel-kicker">DEBUG WORKSPACE</div><h1>{scenario.metadata.name}</h1><p>ノードの実行状況を追跡し、ステップごとに確認できます。</p></div>
      <div className="debug-toolbar">
        <button onClick={onHome} disabled={busy}>⌂ TOPへ</button>
        <button onClick={onEdit} disabled={busy}>✎ 編集へ</button>
        <button className="run-button" onClick={onStart} disabled={busy}>▶ デバッグ開始</button>
        <button onClick={onStep} disabled={!debugging || !pausedNode}>⏭ 次のステップ</button>
        <button onClick={onContinue} disabled={!debugging || !pausedNode}>▷ 続行</button>
        <button className="stop-button" onClick={onStop} disabled={!busy || stopping}>{stopping ? "停止中…" : "■ 停止"}</button>
      </div>
    </div>
    <div className="debug-summary">
      <div><span>実行状態</span><strong>{pausedNode ? "一時停止中" : busy ? stopping ? "停止中" : "実行中" : completedCount ? counts.failed ? "失敗あり" : "完了" : "待機"}</strong></div>
      <div><span>成功ノード</span><strong>{counts.passed} / {scenario.nodes.length}</strong></div>
      <div><span>失敗ノード</span><strong>{counts.failed}</strong></div>
      <div><span>{pausedNode ? "次のノード" : busy ? "実行中のノード" : "最終実行ノード"}</span><strong>{currentNode?.label ?? "—"}</strong></div>
    </div>
    <div className="debug-progress" role="progressbar" aria-label="デバッグ進捗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
      <div className="debug-progress-fill" style={{ width: progressPercent + "%" }}/>
    </div>
    <div className="debug-workspace">
      <aside className="debug-timeline"><div className="panel-kicker">EXECUTION STEPS</div><h3>ステップ一覧</h3>
        <div className="debug-step-list">{scenario.nodes.map((node, index) => {
          const state = nodeStatus[node.id];
          return <div key={node.id} className={"debug-step " + (state ? "debug-step--" + state : "")}>
            <span className="debug-step-number">{index + 1}</span>
            <div className="debug-step-info"><strong>{node.label}</strong><small>{node.type}</small></div>
            <span className="debug-step-state">{state ? labels[state] : "未実行"}</span>
          </div>;
        })}</div>
      </aside>
      <section className="debug-canvas" aria-label="デバッグフロー">
        <div className="debug-canvas-heading"><span className="canvas-dot"/> フロー全体
          <span className="debug-legend"><i className="legend-paused"/> 待機 <i className="legend-running"/> 実行 <i className="legend-passed"/> 成功 <i className="legend-failed"/> 失敗</span>
        </div>
        <ReactFlow colorMode={theme} nodeTypes={nodeTypes} nodes={displayNodes} edges={edges} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} fitView fitViewOptions={{ maxZoom: 0.8, padding: 0.25 }} minZoom={0.2}>
          <Background/><Controls/><MiniMap pannable zoomable/>
        </ReactFlow>
      </section>
      <aside className="debug-output"><div className="panel-kicker">LIVE OUTPUT</div><h3>デバッグログ</h3><p className="debug-current-message">{message}</p>
        <div className="debug-log-stream" role="log" aria-label="デバッグログ">{logs.length ? logs.map((entry, index) => {
          let display = entry;
          try {
            const parsed = JSON.parse(entry) as { type?: string; nodeId?: string; message?: string; status?: string };
            if (parsed.type) {
              const label = scenario.nodes.find(node => node.id === parsed.nodeId)?.label;
              display = [parsed.type, label, parsed.status, parsed.message].filter(Boolean).join(" / ");
            }
          } catch { /* plain log */ }
          return <div key={index}>{display}</div>;
        }) : <p>デバッグを開始するとイベントがここに表示されます。</p>}</div>
      </aside>
    </div>
  </main>;
}
