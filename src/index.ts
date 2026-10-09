// The public API: what callers (MCP servers and other programs) import. The aliases, the key and
// the directory come with the features in .minispec/features/.

/** Something a person can fix (a lost key, an unknown alias), with a message saying how. */
export class PseudonymError extends Error {
  override name = "PseudonymError";
}
