#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { verify } from "./inspect.js";

const server = new McpServer({ name: "opticloop", version: "0.1.0" });

server.registerTool(
  "visual_check",
  {
    title: "Verify the rendered UI",
    description: "Render the app across configured viewports and return compact evidence about layout, browser, and network defects.",
    inputSchema: {
      configPath: z.string().optional().describe("Path to opticloop.config.json"),
      url: z.string().url().optional().describe("App URL; use when configPath is omitted")
    }
  },
  async ({ configPath, url }) => {
    try {
      if (!configPath && !url) throw new Error("Provide configPath or url");
      const result = await verify(await loadConfig(configPath, url));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        structuredContent: result as unknown as Record<string, unknown>,
        isError: result.status === "fail"
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          type: "opticloop.error",
          message: error instanceof Error ? error.message : String(error)
        }) }],
        isError: true
      };
    }
  }
);

await server.connect(new StdioServerTransport());
