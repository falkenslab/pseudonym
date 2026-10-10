// Text the CLI reads, in whatever encoding it came: UTF-8 when it's valid, else what Windows actually wrote.
// cmd's `echo` writes in the console's code page (850 in Spain, 437 in the US), and "ANSI" files are
// Windows-1252; decoding those bytes as UTF-8 would turn every accented letter into U+FFFD.
import { spawnSync } from "node:child_process";

// The upper halves (0x80-0xFF) of the two OEM code pages consoles use most. Node's TextDecoder doesn't know them.
const CP850 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ";
const CP437 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
const OEM: Record<number, string> = { 850: CP850, 437: CP437 };

/** The bytes as text in a single-byte code page: ASCII as it is, the upper half from its table. */
function decodeOem(bytes: Buffer, table: string): string {
  let out = "";
  for (const byte of bytes) out += byte < 0x80 ? String.fromCharCode(byte) : table[byte - 0x80];
  return out;
}

/** The console's code page on Windows (what `chcp` says), or undefined when there's none to ask. */
export function consoleCodePage(): number | undefined {
  if (process.platform !== "win32") return undefined;
  const result = spawnSync("chcp.com", { encoding: "latin1", stdio: ["inherit", "pipe", "ignore"], windowsHide: true });
  const match = /(\d+)\s*$/.exec(result.stdout ?? "");
  return match ? Number(match[1]) : undefined;
}

/**
 * `bytes` as text, and the encoding used: UTF-8 (a BOM dropped) when valid; otherwise `codePage` (850 and 437 by
 * their tables, 1252 and anything else as Windows-1252, which is also what an "ANSI" file is). `codePage` may be a
 * function, called only when the bytes aren't UTF-8.
 */
export function decodeText(bytes: Buffer, codePage?: number | (() => number | undefined)): { text: string; encoding: string } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text: text.charCodeAt(0) === 0xfeff ? text.slice(1) : text, encoding: "utf-8" };
  } catch {
    const page = typeof codePage === "function" ? codePage() : codePage;
    const table = page === undefined ? undefined : OEM[page];
    if (table) return { text: decodeOem(bytes, table), encoding: `code page ${page}` };
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "Windows-1252" };
  }
}
