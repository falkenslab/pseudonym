/**
 * Lower case without accents, one UTF-16 unit for one, so a match found in the folded copy has the same
 * position in the original ("Lucía" and "LUCIA" both fold to "lucia").
 */
export function fold(text: string): string {
  let out = "";
  for (const unit of text.split("")) out += (unit.normalize("NFD")[0] ?? unit).toLowerCase()[0] ?? unit;
  return out;
}
