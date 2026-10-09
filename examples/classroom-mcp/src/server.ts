#!/usr/bin/env node
// The classroom MCP server on stdio, as an MCP client (Claude Code, Claude Desktop) starts it. stdout is the
// protocol: nothing else may print to it.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./tools.js";

await createServer().connect(new StdioServerTransport());
