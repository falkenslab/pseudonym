// Prints the alias of `<service> <email>` under the key in PSEUDONYM_HOME, to compare processes.
import { aliasFor, normalizeIdentifiers } from "../../src/aliases.js";
import { loadKey, subkey } from "../../src/home.js";

const [service = "", email = ""] = process.argv.slice(2);
const [identifier] = normalizeIdentifiers({ email });
if (identifier) console.log(aliasFor(subkey(await loadKey(), "aliases"), service, identifier, false));
