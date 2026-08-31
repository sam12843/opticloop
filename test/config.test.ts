import assert from "node:assert/strict";
import test from "node:test";
import { configSchema } from "../src/schema.js";

test("config supplies token-efficient defaults", () => {
  const config = configSchema.parse({ url: "http://localhost:3000" });
  assert.equal(config.viewports[0]?.width, 1440);
  assert.equal(config.thresholds.minTapTargetPx, 40);
  assert.ok(config.watch.length > 0);
});

test("config rejects an invalid URL", () => {
  assert.throws(() => configSchema.parse({ url: "not-a-url" }));
});
