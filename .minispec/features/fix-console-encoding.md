# Accented letters lost when cmd pipes text into the CLI

Issue: [#12](https://github.com/falkenslab/pseudonym/issues/12)

## Problem

`echo "Esta librería la hizo fran vargas." | pseudonym redact` in Windows' cmd prints `librer�a`: every non-ASCII letter of the input becomes `�`. The same happens with a file saved as "ANSI" (Windows-1252) given to `redact` or `reveal`.

## Cause

`readInput()` in `src/cli.ts` decodes stdin and files as UTF-8. cmd's `echo` writes in the console's code page (850 in Spain, 437 in the US), and older editors save in Windows-1252: a single byte such as `0xA1` (í in code page 850) isn't valid UTF-8, so it's replaced by U+FFFD.

## Solution

Read the input as bytes. Valid UTF-8 (a BOM dropped) is used as it is. Otherwise: stdin on Windows is decoded with the console's code page, read with `chcp` (850 and 437 by their tables, 1252 by `TextDecoder`, anything else as Windows-1252); a file, or stdin elsewhere, as Windows-1252. A line on stderr says which encoding was used. Output stays UTF-8.

## Verification

Unit tests decode code page 850, 437 and Windows-1252 bytes, UTF-8 with and without a BOM; a CLI test pipes code page 850 bytes and a Windows-1252 file into `redact` and gets no U+FFFD.
