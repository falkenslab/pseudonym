# The CLI

The `pseudonym` command is for **the person in charge**: whoever runs a program that uses the library (a teacher running an MCP server for their courses, say). With it they find out who an alias is, look after the directory, and back up and move the key.

It is **never** for an agent. An agent that can run it can undo every alias. See [Keeping agents away from the key](../security/keeping-agents-away.md).

## Install

```bash
npm install --global @falkenslab/pseudonym
pseudonym help
```

Without installing it globally:

```bash
npx @falkenslab/pseudonym help
```

Inside a project that depends on the library, `npx pseudonym help` uses the project's copy.

## Which folder it reads

The same one as every program on the machine that uses the library:

- `%APPDATA%\pseudonym\` on Windows;
- `~/.config/pseudonym/` on macOS and Linux;
- the folder in `PSEUDONYM_HOME`, if set.

If a program you run sets `PSEUDONYM_HOME` (the [classroom example](../example/classroom-mcp.md) does, to keep its demo apart), set it the same way in your terminal before running `pseudonym`:

```powershell
$env:PSEUDONYM_HOME = "C:\path\to\that\folder"   # PowerShell
```

```bash
export PSEUDONYM_HOME=/path/to/that/folder        # sh
```

## What you can do

- [Resolve aliases](resolving-aliases.md): who is `A-7K3F9Q`, and what are Lucía's aliases.
- [Redact and reveal text](redacting-and-revealing.md): make a text safe to paste into a chat, and read the answer with names.
- [Tidy the directory](tidying-the-directory.md): link two aliases of the same person, forget someone, remove people not seen for a while.
- [Back up and move the key](the-key.md): once, the first day.
- [Command reference](reference.md): every command, its output and exit codes.

## The default service

Commands that take a service use `--service`, else the `PSEUDONYM_SERVICE` environment variable, else `default`. `pseudonym services` lists the services the directory knows. See [Which service it uses](redacting-and-revealing.md#which-service-it-uses).

## Output and exit codes

Results go to stdout, messages and warnings to stderr, so the output of a command can be redirected to a file without the warnings in it. Exit codes: `0` done, `1` error (the message says what to do), `2` not found (an unknown alias or name, or no key yet).
