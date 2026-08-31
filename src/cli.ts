#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "./config.js";
import { verify } from "./inspect.js";
import { watch } from "./watch.js";

const program = new Command()
  .name("opticloop")
  .description("Token-efficient visual verification for coding agents")
  .version("0.1.0");

program.command("check")
  .description("Run one visual verification and emit compact JSON")
  .option("-c, --config <path>", "config JSON path")
  .option("-u, --url <url>", "app URL when no config is supplied")
  .option("--pretty", "pretty-print JSON")
  .action(async options => {
    const result = await verify(await loadConfig(options.config, options.url));
    process.stdout.write(`${JSON.stringify(result, null, options.pretty ? 2 : 0)}\n`);
    process.exitCode = result.status === "pass" ? 0 : 1;
  });

program.command("baseline")
  .description("Capture approved visual baselines for every configured viewport")
  .option("-c, --config <path>", "config JSON path")
  .option("-u, --url <url>", "app URL when no config is supplied")
  .option("--pretty", "pretty-print JSON")
  .action(async options => {
    const result = await verify(await loadConfig(options.config, options.url), "baseline");
    process.stdout.write(`${JSON.stringify(result, null, options.pretty ? 2 : 0)}\n`);
    process.exitCode = result.status === "pass" ? 0 : 1;
  });

program.command("watch")
  .description("Continuously verify after source changes and emit NDJSON events")
  .option("-c, --config <path>", "config JSON path")
  .option("-u, --url <url>", "app URL when no config is supplied")
  .action(async options => {
    const config = await loadConfig(options.config, options.url);
    await watch(config, result => process.stdout.write(`${JSON.stringify(result)}\n`));
  });

program.parseAsync().catch(error => {
  process.stderr.write(`opticloop: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
});
