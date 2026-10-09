import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/.pseudonym/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    // The library may run inside an MCP server, whose stdout is the protocol: only the CLI prints.
    files: ["src/**/*.ts"],
    ignores: ["src/cli.ts"],
    rules: { "no-console": "error" },
  },
);
