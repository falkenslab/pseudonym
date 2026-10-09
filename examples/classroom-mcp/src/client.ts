// An MCP client connected to the server in the same process, for the demo and the tests: the tools are
// called through the protocol, exactly as a model's client would call them.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCourse } from "./course.js";
import { createServer } from "./tools.js";

export interface ToolResult {
  text: string;
  isError: boolean;
}

export async function connect(course = createCourse()) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer(course).connect(serverSide);
  const client = new Client({ name: "classroom-demo", version: "0.0.0" });
  await client.connect(clientSide);
  return {
    course,
    client,
    /** Calls a tool and returns its text, as the model would read it. */
    async call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
      const result = await client.callTool({ name, arguments: args });
      const content = result.content as { type: string; text?: string }[];
      return { text: content.map((part) => part.text ?? "").join("\n"), isError: result.isError === true };
    },
    close: () => client.close(),
  };
}
