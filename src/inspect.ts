import { randomUUID } from "node:crypto";
import { chromium, type Browser, type Page } from "playwright";
import type { Issue, OpticloopConfig, VerificationResult, ViewportResult } from "./schema.js";
import { captureAndCompare, type VisualMode } from "./visual.js";

type DomFinding = { kind: Issue["kind"]; selector?: string; message: string; actual?: number; expected?: number };

async function inspectViewport(browser: Browser, config: OpticloopConfig, viewport: OpticloopConfig["viewports"][number], runId: string, mode: VisualMode): Promise<ViewportResult> {
  const started = performance.now();
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const issues: Issue[] = [];

  page.on("console", message => {
    if (message.type() === "error") issues.push({ kind: "console", severity: "error", message: message.text().slice(0, 500) });
  });
  page.on("response", response => {
    if (response.status() >= 400) issues.push({ kind: "network", severity: "error", message: `${response.status()} ${response.url()}`.slice(0, 500) });
  });

  await page.goto(config.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(config.settleMs);
  const summary = await collectDomFindings(page, config.thresholds);
  issues.push(...summary.findings.map((finding): Issue => ({
    ...finding,
    severity: finding.kind === "tap-target" ? "warning" : "error"
  })));
  const visual = await captureAndCompare(page, config, viewport.name, runId, mode);
  if (mode === "check" && visual.baselineExists && (visual.changedPercent ?? 0) > config.thresholds.maxVisualDiffPercent) {
    issues.push({
      kind: "visual-diff",
      severity: "error",
      message: `Visual change ${visual.changedPercent}% exceeds ${config.thresholds.maxVisualDiffPercent}%`,
      actual: visual.changedPercent,
      expected: config.thresholds.maxVisualDiffPercent
    });
  }
  const result: ViewportResult = {
    viewport,
    status: issues.some(issue => issue.severity === "error") ? "fail" : "pass",
    durationMs: Math.round(performance.now() - started),
    issues: dedupe(issues).slice(0, 30),
    page: { title: await page.title(), elementCount: summary.elementCount, interactiveCount: summary.interactiveCount },
    visual
  };
  await context.close();
  return result;
}

async function collectDomFindings(page: Page, thresholds: OpticloopConfig["thresholds"]): Promise<{ findings: DomFinding[]; elementCount: number; interactiveCount: number }> {
  return page.evaluate(({ maxHorizontalOverflowPx, minTapTargetPx }) => {
    const selectorFor = (element: Element): string => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
      const classes = [...element.classList].slice(0, 2).map(c => `.${CSS.escape(c)}`).join("");
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const findings: DomFinding[] = [];
    const rootOverflow = document.documentElement.scrollWidth - window.innerWidth;
    if (rootOverflow > maxHorizontalOverflowPx) findings.push({ kind: "overflow", message: `Page overflows viewport horizontally by ${rootOverflow}px`, actual: rootOverflow, expected: maxHorizontalOverflowPx });

    const all = [...document.querySelectorAll("body *")];
    const visible = all.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });
    const interactive = visible.filter(el => el.matches("a[href],button,input,select,textarea,[role=button],[tabindex]:not([tabindex='-1'])"));
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      if (rect.right < 0 || rect.left > window.innerWidth || rect.bottom < 0) {
        findings.push({ kind: "offscreen", selector: selectorFor(el), message: "Interactive element is outside the viewport" });
      }
      if (window.innerWidth <= 480 && (rect.width < minTapTargetPx || rect.height < minTapTargetPx)) {
        findings.push({ kind: "tap-target", selector: selectorFor(el), message: `Tap target is ${Math.round(rect.width)}x${Math.round(rect.height)}px`, actual: Math.min(rect.width, rect.height), expected: minTapTargetPx });
      }
    }
    return { findings, elementCount: all.length, interactiveCount: interactive.length };
  }, thresholds);
}

function dedupe(issues: Issue[]): Issue[] {
  return [...new Map(issues.map(issue => [`${issue.kind}:${issue.selector ?? ""}:${issue.message}`, issue])).values()];
}

export async function verify(config: OpticloopConfig, mode: VisualMode = "check"): Promise<VerificationResult> {
  const started = performance.now();
  const runId = randomUUID();
  const browser = await chromium.launch({ headless: true });
  try {
    const results: ViewportResult[] = [];
    for (const viewport of config.viewports) results.push(await inspectViewport(browser, config, viewport, runId, mode));
    const base = {
      type: "opticloop.verification" as const,
      version: 1 as const,
      runId,
      timestamp: new Date().toISOString(),
      url: config.url,
      status: results.some(result => result.status === "fail") ? "fail" as const : "pass" as const,
      durationMs: Math.round(performance.now() - started),
      results
    };
    const structuredBytes = Buffer.byteLength(JSON.stringify(base));
    const estimatedStructuredTokens = Math.ceil(structuredBytes / 4);
    const estimatedFullScreenshotTokens = results.length * 1800;
    return { ...base, context: {
      structuredBytes,
      estimatedStructuredTokens,
      estimatedFullScreenshotTokens,
      estimatedTokenReductionPct: Math.max(0, Math.round((1 - estimatedStructuredTokens / estimatedFullScreenshotTokens) * 100))
    }};
  } finally {
    await browser.close();
  }
}
