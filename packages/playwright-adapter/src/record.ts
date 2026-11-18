import type { Page } from "playwright";
import type { ScenarioNode } from "../../schema/src/scenario";

export type RecordedAction =
  | { type: "navigate"; url: string }
  | { type: "click"; selector: string }
  | { type: "fill"; selector: string; value: string };

export function toRecordedNode(action: RecordedAction, index: number): ScenarioNode {
  const base = { id: crypto.randomUUID(), label: action.type, position: { x: 200, y: 140 + index * 110 } };
  switch (action.type) {
    case "navigate": return { ...base, type: "navigate", config: { url: action.url } };
    case "click": return { ...base, type: "click", config: { locator: { strategy: "css", value: action.selector } } };
    case "fill": return { ...base, type: "fill", config: { locator: { strategy: "css", value: action.selector }, value: action.value } };
  }
}

/** Capture browser navigation, clicks and input changes while recording is enabled. */
export async function attachRecorder(page: Page, onAction: (action: RecordedAction) => void): Promise<() => Promise<void>> {
  let active = true;
  const handle = (_source: unknown, action: RecordedAction) => {
    if (!active || !action || typeof action !== "object") return;
    if (action.type === "navigate" && typeof action.url === "string" && /^https?:\/\//.test(action.url)) onAction(action);
    if (action.type === "click" && typeof action.selector === "string" && action.selector.length > 0) onAction(action);
    if (action.type === "fill" && typeof action.selector === "string" && action.selector.length > 0 && typeof action.value === "string") onAction(action);
  };
  await page.exposeBinding("__scenarioRecord", handle);
  const script = `(() => {
    const selector = (element) => {
      if (element.id) return '#' + CSS.escape(element.id);
      const testid = element.getAttribute('data-testid');
      if (testid) return '[data-testid=' + JSON.stringify(testid) + ']';
      const parts = [];
      for (let el = element; el && el.nodeType === 1 && parts.length < 6; el = el.parentElement) {
        let part = el.tagName.toLowerCase();
        const siblings = el.parentElement ? [...el.parentElement.children].filter(s => s.tagName === el.tagName) : [];
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
        parts.unshift(part);
        if (el.id) break;
      }
      return parts.join(' > ');
    };
    document.addEventListener('click', e => {
      const el = e.target instanceof Element ? e.target.closest('button, a, input[type="button"], input[type="submit"]') : null;
      if (el) window.__scenarioRecord({ type: 'click', selector: selector(el) });
    }, true);
    document.addEventListener('change', e => {
      const el = e.target;
      if (el instanceof HTMLInputElement && !['password', 'hidden', 'file', 'checkbox', 'radio'].includes(el.type) && !el.autocomplete.toLowerCase().includes('password') && !el.autocomplete.toLowerCase().includes('cc-'))
        window.__scenarioRecord({ type: 'fill', selector: selector(el), value: el.value });
      else if (el instanceof HTMLTextAreaElement && !el.autocomplete.toLowerCase().includes('password'))
        window.__scenarioRecord({ type: 'fill', selector: selector(el), value: el.value });
    }, true);
  })()`;
  await page.addInitScript({ content: script });
  await page.evaluate(script);
  const navigation = (frame: import("playwright").Frame) => {
    if (active && frame === page.mainFrame() && /^https?:/.test(frame.url())) onAction({ type: "navigate", url: frame.url() });
  };
  page.on("framenavigated", navigation);
  return async () => {
    active = false;
    page.off("framenavigated", navigation);
  };
}
