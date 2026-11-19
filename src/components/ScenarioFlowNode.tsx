import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ScenarioNode } from "../../packages/schema/src/scenario";

type Kind = ScenarioNode["type"];
export type ScenarioFlowData = { label: string; kind: Kind; detail: string };

const visual: Record<Kind, { icon: string; category: string }> = {
  start: { icon: "▶", category: "START" },
  end: { icon: "■", category: "END" },
  navigate: { icon: "↗", category: "NAVIGATE" },
  click: { icon: "↖", category: "CLICK" },
  fill: { icon: "✎", category: "INPUT" },
  wait: { icon: "◷", category: "WAIT" },
  condition: { icon: "◇", category: "BRANCH" },
  assertVisible: { icon: "◉", category: "ASSERT" },
  assertText: { icon: "✓", category: "ASSERT" },
};

export function nodeDetail(node: ScenarioNode): string {
  switch (node.type) {
    case "start": return "シナリオ開始";
    case "end": return "シナリオ終了";
    case "navigate": return node.config.url;
    case "click":
    case "assertVisible":
    case "assertText": return node.config.locator.strategy === "role"
      ? `role: ${node.config.locator.role}`
      : node.config.locator.value;
    case "fill": return node.config.locator.strategy === "role"
      ? `role: ${node.config.locator.role}`
      : node.config.locator.value;
    case "condition": return node.config.check === "visible" ? "表示されている？" : `文字列: ${node.config.expected ?? ""}`;
    case "wait": return `${node.config.durationMs.toLocaleString()} ms`;
  }
}

export function ScenarioFlowNode({ data }: NodeProps) {
  const node = data as ScenarioFlowData;
  const meta = visual[node.kind] ?? visual.click;
  return (
    <div className={`scenario-node scenario-node--${node.kind}`} data-node-kind={node.kind}>
      {node.kind !== "start" && <Handle type="target" position={Position.Top} />}
      <div className="scenario-node__top">
        <span className="scenario-node__icon" aria-hidden="true">{meta.icon}</span>
        <span className="scenario-node__category">{meta.category}</span>
      </div>
      <div className="scenario-node__label">{node.label}</div>
      <div className="scenario-node__detail" title={node.detail}>{node.detail}</div>
      {node.kind === "condition" ? <><Handle id="true" type="source" position={Position.Left} /><span className="branch-label branch-label--true">YES</span><Handle id="false" type="source" position={Position.Right} /><span className="branch-label branch-label--false">NO</span></> : node.kind !== "end" && <Handle type="source" position={Position.Bottom} />}
    </div>
  );
}
