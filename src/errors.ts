/** Something a person can fix (a lost key, an unknown alias), with a message saying how. */
export class PseudonymError extends Error {
  override name = "PseudonymError";
}
