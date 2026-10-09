// Reading the key without showing it: from a pipe as is, from a terminal key by key in raw mode.

export interface Typed {
  text: string;
  /** Set when the chunk ended the input: Enter, or Ctrl+C. */
  end?: "enter" | "cancel";
}

// Arrow keys, Delete and a terminal's bracketed-paste markers (ESC [ 200 ~ ... ESC [ 201 ~) arrive as escape
// sequences: none of them is part of a key.
// eslint-disable-next-line no-control-regex -- matching the ESC control character is the point
const ESCAPE_SEQUENCE = /\u001b\[[0-9;]*[~A-Za-z]/g;

/** What raw-mode `chunk` does to the `text` typed so far. Characters after Enter or Ctrl+C are ignored. */
export function typeChunk(text: string, chunk: string): Typed {
  for (const char of chunk.replace(ESCAPE_SEQUENCE, "")) {
    if (char === "\r" || char === "\n") return { text, end: "enter" };
    if (char === "\u0003") return { text, end: "cancel" };
    if (char === "\u007f" || char === "\b") text = text.slice(0, -1);
    else if (char >= " ") text += char;
  }
  return { text };
}

/** What the person types or pipes in; on a terminal, nothing typed is echoed. Undefined if they cancel. */
export async function readSecret(prompt: string): Promise<string | undefined> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    let text = "";
    for await (const chunk of stdin) text += String(chunk);
    return text;
  }
  process.stderr.write(prompt);
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  try {
    return await new Promise<string | undefined>((resolve) => {
      let text = "";
      const onData = (chunk: string) => {
        const typed = typeChunk(text, chunk);
        text = typed.text;
        if (!typed.end) return;
        stdin.off("data", onData);
        resolve(typed.end === "enter" ? text : undefined);
      };
      stdin.on("data", onData);
      stdin.resume();
    });
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
    process.stderr.write("\n");
  }
}
