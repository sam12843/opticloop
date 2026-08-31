import { z } from "zod";

export const configSchema = z.object({
  url: z.string().url(),
  watch: z.array(z.string()).default(["src/**/*.{ts,tsx,js,jsx,css,html}"]),
  viewports: z.array(z.object({
    name: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive()
  })).min(1).default([{ name: "desktop", width: 1440, height: 900 }]),
  settleMs: z.number().int().nonnegative().default(250),
  thresholds: z.object({
    maxHorizontalOverflowPx: z.number().nonnegative().default(1),
    minTapTargetPx: z.number().positive().default(40),
    maxVisualDiffPercent: z.number().min(0).max(100).default(0.5),
    pixelSensitivity: z.number().min(0).max(1).default(0.1)
  }).default({ maxHorizontalOverflowPx: 1, minTapTargetPx: 40, maxVisualDiffPercent: 0.5, pixelSensitivity: 0.1 }),
  artifactsDir: z.string().default(".opticloop")
});

export type OpticloopConfig = z.infer<typeof configSchema>;

export type Issue = {
  kind: "console" | "network" | "overflow" | "offscreen" | "tap-target" | "visual-diff";
  severity: "error" | "warning";
  selector?: string;
  message: string;
  actual?: number;
  expected?: number;
};

export type ViewportResult = {
  viewport: { name: string; width: number; height: number };
  status: "pass" | "fail";
  durationMs: number;
  issues: Issue[];
  page: { title: string; elementCount: number; interactiveCount: number };
  visual: {
    screenshotPath: string;
    baselinePath: string;
    diffPath?: string;
    changedRegionPath?: string;
    changedRegion?: { x: number; y: number; width: number; height: number };
    baselineExists: boolean;
    changedPixels?: number;
    changedPercent?: number;
    visualScore?: number;
  };
};

export type VerificationResult = {
  type: "opticloop.verification";
  version: 1;
  runId: string;
  timestamp: string;
  url: string;
  status: "pass" | "fail";
  durationMs: number;
  results: ViewportResult[];
  context: {
    structuredBytes: number;
    estimatedStructuredTokens: number;
    estimatedFullScreenshotTokens: number;
    estimatedTokenReductionPct: number;
  };
};
