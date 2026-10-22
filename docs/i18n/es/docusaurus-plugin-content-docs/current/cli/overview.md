# La CLI {#the-cli}

El comando `pseudonym` es para **la persona responsable**: quien ejecuta un programa que usa la librería (por ejemplo, un docente que tiene un servidor MCP para sus cursos). Con él averigua quién hay detrás de un alias, mantiene el directorio y hace copia de seguridad de la clave y la traslada.

**Nunca** es para un agente. Un agente que pueda ejecutarlo puede deshacer todos los alias. Consulta [Mantener a los agentes lejos de la clave](../security/keeping-agents-away.md).

## Instalación {#install}

```bash
npm install --global @falkenslab/pseudonym
pseudonym help
```

Sin instalarlo globalmente:

```bash
npx @falkenslab/pseudonym help
```

Dentro de un proyecto que depende de la librería, `npx pseudonym help` usa la copia del proyecto.

## Qué carpeta lee {#which-folder-it-reads}

La misma que todos los programas de la máquina que usan la librería:

- `%APPDATA%\pseudonym\` en Windows;
- `~/.config/pseudonym/` en macOS y Linux;
- la carpeta indicada en `PSEUDONYM_HOME`, si está definida.

Si un programa que ejecutas define `PSEUDONYM_HOME` (el [ejemplo del aula](../example/classroom-mcp.md) lo hace, para mantener aparte su demo), defínela igual en tu terminal antes de ejecutar `pseudonym`:

```powershell
$env:PSEUDONYM_HOME = "C:\path\to\that\folder"   # PowerShell
```

```bash
export PSEUDONYM_HOME=/path/to/that/folder        # sh
```

## Qué puedes hacer {#what-you-can-do}

- [Resolver alias](resolving-aliases.md): quién es `A-7K3F9Q` y cuáles son los alias de Lucía.
- [Redactar y revelar texto](redacting-and-revealing.md): dejar un texto listo para pegarlo en un chat y leer la respuesta con nombres.
- [Usar la librería sin código](without-code.md): cargar una clase desde un CSV, seudonimizar una exportación para un modelo, resolver un alias en un script.
- [Ordenar el directorio](tidying-the-directory.md): enlazar dos alias de la misma persona, olvidar a alguien o un servicio entero, eliminar a quienes llevan tiempo sin aparecer.
- [Hacer copia de la clave y trasladarla](the-key.md): una vez, el primer día.
- [Referencia de comandos](reference.md): cada comando, su salida y sus códigos de salida.

## El servicio por defecto {#the-default-service}

Los comandos que reciben un servicio usan `--service`; si no, la variable de entorno `PSEUDONYM_SERVICE`; y si tampoco, `default`. `pseudonym services` lista los servicios que conoce el directorio. Consulta [Qué servicio usa](redacting-and-revealing.md#which-service-it-uses).

## Salida y códigos de salida {#output-and-exit-codes}

Los resultados van a stdout y los mensajes y avisos a stderr, así que puedes redirigir la salida de un comando a un fichero sin que los avisos acaben en él. Códigos de salida: `0` hecho, `1` error (el mensaje dice qué hacer), `2` no encontrado (un alias o nombre desconocido, o todavía no hay clave).
