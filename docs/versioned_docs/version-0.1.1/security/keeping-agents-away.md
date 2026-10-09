# Keeping agents away from the key

The library keeps people's data from reaching a model by accident. But an agent running on the same machine (Claude Code, say, helping the teacher who runs the MCP server) could read the key folder or run `pseudonym whois`, and undo it. The library can't prevent that from inside: the client running the agent has to.

## Claude Code's deny rules

In the user settings (`~/.claude/settings.json`), so they apply in every project:

```json
{
  "permissions": {
    "deny": [
      "Read(~/AppData/Roaming/pseudonym/**)",
      "Edit(~/AppData/Roaming/pseudonym/**)",
      "Read(~/.config/pseudonym/**)",
      "Edit(~/.config/pseudonym/**)",
      "Bash(pseudonym *)",
      "Bash(npx pseudonym *)",
      "Bash(npx -y pseudonym *)",
      "Bash(npx @falkenslab/pseudonym *)",
      "PowerShell(pseudonym *)",
      "PowerShell(npx pseudonym *)",
      "PowerShell(npx -y pseudonym *)",
      "PowerShell(npx @falkenslab/pseudonym *)"
    ]
  }
}
```

- If `permissions` already exists in the file, add the `deny` list inside it; don't replace the whole object.
- The `AppData` lines are for Windows (where `~` is `%USERPROFILE%`; `//c/Users/<user>/AppData/Roaming/pseudonym/**` is the explicit form), the `.config` lines for macOS and Linux. Both can stay.
- If a program uses `PSEUDONYM_HOME`, add the same `Read` and `Edit` rules for that folder.
- On Windows, the `PowerShell` lines are needed: a `Bash` rule doesn't cover the PowerShell tool, and with Git Bash installed a `Bash` deny rule alone turns the PowerShell tool off for the session.
- `Edit` rules matter too: redirections such as `> file` are checked against them.

Rule syntax: [Claude Code's permissions](https://code.claude.com/docs/en/permissions).

## What we tested

With Claude Code 2.1, in non-interactive sessions (`claude -p`), against a decoy file in the folder (never the real key):

| Attempt | Without the rules | With the rules |
| --- | --- | --- |
| The Read tool on the file | Read | **Denied** ("File is in a directory that is denied by your permission settings") |
| The same, with `//c/Users/…` instead of `~/AppData/…` | Read | **Denied** |
| Bash `pseudonym help` | Ran | **Denied** |
| PowerShell `pseudonym help` | Ran | **Denied** |
| Bash `cat <the file's path>` | Read | **Denied** by the `Read` rule |
| PowerShell `type <the file's path>` | Read | **Denied** by the `Read` rule |
| PowerShell `Get-Content $env:APPDATA\pseudonym\<file>` | Read | **Read**: not blocked |

## What the rules can't stop

The rules match the literal text of commands and the paths Claude Code recognizes. They don't stop:

- **a path written with variables**, as in the last row above: `$env:APPDATA`, `$HOME`, `%APPDATA%`;
- **a script that opens the key itself**: `node -e "…readFileSync(…)…"`, a Python one-liner;
- **the CLI run another way**: `node path/to/cli.js whois …`, `./node_modules/.bin/pseudonym`;
- **a search run inside the folder**: `grep -r` from `~/.config/pseudonym`.

In our tests, Claude Code's auto mode classifier also refused the `Get-Content` read ("Credential Exploration"), but a classifier's judgment isn't a guarantee.

## Real enforcement: the sandbox

For a block that holds whatever command the agent writes, enable [Claude Code's sandbox](https://code.claude.com/docs/en/sandboxing), which restricts file access at the operating system's level, and keep the key folder outside what it allows.

## Other clients

The same applies to any agent with access to your files or a shell: deny it the key folder and the `pseudonym` command, in whatever way it offers, and prefer a sandbox. Tell your users in your README.
