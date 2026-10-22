# Mantener a los agentes lejos de la clave {#keeping-agents-away-from-the-key}

La librería evita que los datos de las personas lleguen por accidente a un modelo. Pero un agente que se ejecute en la misma máquina (Claude Code, por ejemplo, ayudando al docente que ejecuta el servidor MCP) podría leer la carpeta de la clave o ejecutar `pseudonym whois`, y deshacerlo. La librería no puede impedirlo desde dentro: tiene que hacerlo el cliente que ejecuta el agente.

Lo mismo vale para lo que la CLI muestra a la persona: `whois`, `alias`, `aliases`, `remember --csv` (sin `--only-aliases`), `resolve` y `reveal` muestran nombres o identificadores en claro. Léelos tú; nunca los pegues de vuelta en un chat con un modelo, y no los dejes en archivos que un agente pueda leer.

## Las reglas de denegación de Claude Code {#claude-codes-deny-rules}

En la configuración de usuario (`~/.claude/settings.json`), para que se apliquen en todos los proyectos:

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

- Si `permissions` ya existe en el archivo, añade la lista `deny` dentro; no sustituyas el objeto entero.
- Las líneas de `AppData` son para Windows (donde `~` es `%USERPROFILE%`; `//c/Users/<user>/AppData/Roaming/pseudonym/**` es la forma explícita), y las de `.config`, para macOS y Linux. Pueden quedarse ambas.
- Si un programa usa `PSEUDONYM_HOME`, añade las mismas reglas `Read` y `Edit` para esa carpeta.
- En Windows hacen falta las líneas de `PowerShell`: una regla `Bash` no cubre la herramienta PowerShell y, con Git Bash instalado, una regla de denegación `Bash` sola desactiva la herramienta PowerShell durante la sesión.
- Las reglas `Edit` también importan: las redirecciones como `> file` se comprueban con ellas.

Sintaxis de las reglas: [los permisos de Claude Code](https://code.claude.com/docs/en/permissions).

## Lo que probamos {#what-we-tested}

Con Claude Code 2.1, en sesiones no interactivas (`claude -p`), contra un archivo señuelo en la carpeta (nunca la clave real):

| Intento | Sin las reglas | Con las reglas |
| --- | --- | --- |
| La herramienta Read sobre el archivo | Leído | **Denegado** ("File is in a directory that is denied by your permission settings", el archivo está en un directorio denegado por tu configuración de permisos) |
| Lo mismo, con `//c/Users/…` en lugar de `~/AppData/…` | Leído | **Denegado** |
| Bash `pseudonym help` | Ejecutado | **Denegado** |
| PowerShell `pseudonym help` | Ejecutado | **Denegado** |
| Bash `cat <the file's path>` | Leído | **Denegado** por la regla `Read` |
| PowerShell `type <the file's path>` | Leído | **Denegado** por la regla `Read` |
| PowerShell `Get-Content $env:APPDATA\pseudonym\<file>` | Leído | **Leído**: no se bloquea |

## Lo que las reglas no pueden impedir {#what-the-rules-cant-stop}

Las reglas comparan el texto literal de los comandos y las rutas que Claude Code reconoce. No impiden:

- **una ruta escrita con variables**, como en la última fila de arriba: `$env:APPDATA`, `$HOME`, `%APPDATA%`;
- **un script que abra la clave por su cuenta**: `node -e "…readFileSync(…)…"`, una línea de Python;
- **la CLI ejecutada de otra forma**: `node path/to/cli.js whois …`, `./node_modules/.bin/pseudonym`;
- **una búsqueda lanzada dentro de la carpeta**: `grep -r` desde `~/.config/pseudonym`.

En nuestras pruebas, el clasificador del modo automático de Claude Code también rechazó la lectura con `Get-Content` ("Credential Exploration", exploración de credenciales), pero el criterio de un clasificador no es una garantía.

## Bloqueo real: el sandbox {#real-enforcement-the-sandbox}

Para un bloqueo que aguante sea cual sea el comando que escriba el agente, activa [el sandbox (entorno aislado) de Claude Code](https://code.claude.com/docs/en/sandboxing), que restringe el acceso a archivos a nivel del sistema operativo, y deja la carpeta de la clave fuera de lo que permite.

## Otros clientes {#other-clients}

Lo mismo se aplica a cualquier agente con acceso a tus archivos o a una shell: niégale la carpeta de la clave y el comando `pseudonym`, de la forma que ofrezca, y prefiere un sandbox. Cuéntaselo a tus usuarios en tu README.
