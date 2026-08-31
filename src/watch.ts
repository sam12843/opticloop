import chokidar from "chokidar";
import type { OpticloopConfig, VerificationResult } from "./schema.js";
import { verify } from "./inspect.js";

export async function watch(config: OpticloopConfig, emit: (result: VerificationResult) => void): Promise<never> {
  let running = false;
  let queued = false;
  let timer: NodeJS.Timeout | undefined;

  const run = async () => {
    if (running) { queued = true; return; }
    running = true;
    try { emit(await verify(config)); }
    catch (error) { process.stderr.write(`opticloop: ${error instanceof Error ? error.message : String(error)}\n`); }
    finally {
      running = false;
      if (queued) { queued = false; void run(); }
    }
  };

  await run();
  chokidar.watch(config.watch, { ignoreInitial: true }).on("all", () => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), 150);
  });
  return new Promise<never>(() => undefined);
}
