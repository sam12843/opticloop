import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { configSchema, type OpticloopConfig } from "./schema.js";

export async function loadConfig(path?: string, url?: string): Promise<OpticloopConfig> {
  const raw = path
    ? JSON.parse(await readFile(resolve(path), "utf8")) as unknown
    : { url };
  return configSchema.parse(raw);
}
