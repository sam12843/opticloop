import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import type { Page } from "playwright";
import type { OpticloopConfig, ViewportResult } from "./schema.js";

export type VisualMode = "check" | "baseline";

function safeName(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
}

export async function captureAndCompare(
  page: Page,
  config: OpticloopConfig,
  viewportName: string,
  runId: string,
  mode: VisualMode
): Promise<ViewportResult["visual"]> {
  const root = resolve(config.artifactsDir);
  const name = safeName(viewportName);
  const screenshotPath = resolve(root, "runs", runId, `${name}.png`);
  const baselinePath = resolve(root, "baselines", `${name}.png`);
  const diffPath = resolve(root, "runs", runId, `${name}.diff.png`);
  const changedRegionPath = resolve(root, "runs", runId, `${name}.changed.png`);
  const screenshot = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
  await mkdir(dirname(screenshotPath), { recursive: true });
  await writeFile(screenshotPath, screenshot);

  if (mode === "baseline") {
    await mkdir(dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, screenshot);
    return { screenshotPath, baselinePath, baselineExists: true, changedPixels: 0, changedPercent: 0, visualScore: 100 };
  }

  let baselineBytes: Buffer;
  try { baselineBytes = await readFile(baselinePath); }
  catch { return { screenshotPath, baselinePath, baselineExists: false }; }

  const current = PNG.sync.read(screenshot);
  const baseline = PNG.sync.read(baselineBytes);
  if (current.width !== baseline.width || current.height !== baseline.height) {
    return { screenshotPath, baselinePath, baselineExists: true, changedPercent: 100, visualScore: 0 };
  }

  const diff = new PNG({ width: current.width, height: current.height });
  const changedPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    current.width,
    current.height,
    { threshold: config.thresholds.pixelSensitivity, diffMask: true }
  );
  const changedPercent = Number((changedPixels / (current.width * current.height) * 100).toFixed(4));
  if (changedPixels > 0) await writeFile(diffPath, PNG.sync.write(diff));
  const changedRegion = changedPixels > 0 ? findChangedRegion(diff, 12) : undefined;
  if (changedRegion) {
    const crop = new PNG({ width: changedRegion.width, height: changedRegion.height });
    PNG.bitblt(current, crop, changedRegion.x, changedRegion.y, changedRegion.width, changedRegion.height, 0, 0);
    await writeFile(changedRegionPath, PNG.sync.write(crop));
  }
  return {
    screenshotPath,
    baselinePath,
    diffPath: changedPixels > 0 ? diffPath : undefined,
    changedRegionPath: changedRegion ? changedRegionPath : undefined,
    changedRegion,
    baselineExists: true,
    changedPixels,
    changedPercent,
    visualScore: Number(Math.max(0, 100 - changedPercent).toFixed(2))
  };
}

function findChangedRegion(diff: PNG, padding: number): { x: number; y: number; width: number; height: number } | undefined {
  let left = diff.width;
  let top = diff.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < diff.height; y++) {
    for (let x = 0; x < diff.width; x++) {
      if (diff.data[(y * diff.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return undefined;
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(diff.width - 1, right + padding); bottom = Math.min(diff.height - 1, bottom + padding);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
