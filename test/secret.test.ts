import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { typeChunk } from "../src/secret.js";

/** Feeds chunks one by one, as a terminal in raw mode would. */
function type(...chunks: string[]) {
  let text = "";
  for (const chunk of chunks) {
    const typed = typeChunk(text, chunk);
    text = typed.text;
    if (typed.end) return typed;
  }
  return { text };
}

describe("hidden key input", () => {
  it("ends with Enter, as \\r or \\n", () => {
    assert.deepEqual(type("abc", "\r"), { text: "abc", end: "enter" });
    assert.deepEqual(type("abc\n"), { text: "abc", end: "enter" });
  });

  it("takes a pasted key in one chunk, ignoring what follows Enter", () => {
    assert.deepEqual(type("q2Fx+/w==\r\nleftover"), { text: "q2Fx+/w==", end: "enter" });
  });

  it("deletes with backspace, as DEL or BS, and never below empty", () => {
    assert.deepEqual(type("abd", "\u007f", "c", "\b\b", "\u007f\u007f\u007f", "x\r"), { text: "x", end: "enter" });
  });

  it("cancels with Ctrl+C, whatever was typed", () => {
    assert.deepEqual(type("secret", "\u0003"), { text: "secret", end: "cancel" });
  });

  it("drops arrow keys, Delete and bracketed-paste markers", () => {
    assert.deepEqual(type("\u001b[200~abc\u001b[201~", "\u001b[D\u001b[C\u001b[3~", "\r"), { text: "abc", end: "enter" });
  });

  it("drops other control characters, such as Tab", () => {
    assert.deepEqual(type("a\tb\u0001c\r"), { text: "abc", end: "enter" });
  });

  it("waits while there's no Enter", () => {
    assert.deepEqual(type("abc"), { text: "abc" });
  });
});
