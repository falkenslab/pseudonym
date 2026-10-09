# Backing up and moving the key

The key is created the first time a program on this machine uses the library. Everything depends on it: without it, no alias can be resolved and the directory can't be read. **Back it up once, the first day.**

## The fingerprint

```text
$ pseudonym key fingerprint
CJ76RG29
```

A short code that identifies the key without revealing anything about it. Two machines with the same fingerprint give the same people the same aliases. Use it to check a backup or a move.

If there's no key yet, it says so and exits with code `2`; it never creates one.

## Back it up

```bash
pseudonym key export > pseudonym-key.txt
```

The key goes to stdout as base64, and a warning to stderr. **Whoever has the key can resolve every alias**: keep the file somewhere safe (a password manager is a good place), and never where an agent can read it. Then delete the copy in the current folder.

`key export` is the only command that ever prints the key, and only when you run it.

## Restore it, or move it to another machine

The key is read from **stdin**, never from the command line, where it would stay in the shell's history and be visible in the process list:

```bash
pseudonym key import < pseudonym-key.txt
```

Or run it alone and paste the key when asked: nothing is shown on screen while you type or paste, and Ctrl+C cancels.

```text
$ pseudonym key import
Paste the key (from "pseudonym key export"):
Key imported (fingerprint CJ76RG29).
```

- On a machine with no key, it's installed.
- If the key was lost after being used here (the library then refuses to work, pointing to this command), importing the same key brings everything back: the directory opens again and aliases are the same.
- If the same key is already there, it says so and changes nothing.

To use the same aliases on two machines, import the same key on both. Each machine keeps its own directory: a person met only on one machine is resolvable only there, until it's met on the other too.

## Replace a different key

`key import` refuses to replace a key that's different from the one you give it: every alias and the directory depend on the current one.

```text
$ pseudonym key import < other-key.txt
pseudonym: A different key is already in use (fingerprint CJ76RG29). Every alias and the directory depend on it. To replace it anyway, run "pseudonym key import --force": the current directory will be kept as a backup that only the old key opens.
```

With `--force`, it first moves the current directory to `directory.enc.<date>.bak` in the same folder (it says where), then installs the new key. Nothing is deleted: importing the old key again and renaming the backup back to `directory.enc` restores the previous state.

## If the key is lost for good

There is no recovery, by design: aliases can't be resolved, and the directory can't be read. Programs refuse to work rather than silently creating a new key that would give everyone new aliases. To start over, delete the folder entirely (`key`, `used` and `directory.enc`); the next program to run creates a new key, and everyone gets new aliases.
