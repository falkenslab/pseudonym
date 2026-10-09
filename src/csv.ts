// CSV as RFC 4180 writes it: fields separated by commas, quoted when they hold a comma, a quote or a line break,
// quotes doubled inside. Enough for an LMS export; no dependency.

/** The rows of a CSV text, each with its 1-based line number (a quoted field may span several lines). */
export function parseCsv(text: string): { line: number; fields: string[] }[] {
  const rows: { line: number; fields: string[] }[] = [];
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  const endRow = () => {
    fields.push(field);
    if (fields.length > 1 || fields[0] !== "") rows.push({ line: rowLine, fields });
    fields = [];
    field = "";
  };
  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else {
        if (char === "\n") line++;
        field += char;
      }
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") {
      fields.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      endRow();
      line++;
      rowLine = line;
    } else field += char;
  }
  if (field !== "" || fields.length > 0) endRow();
  return rows;
}

/** One CSV field, quoted when it needs to be. */
export const csvField = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** One CSV line, without the line break. */
export const csvLine = (fields: string[]) => fields.map(csvField).join(",");
