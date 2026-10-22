# El ejemplo MCP del aula {#the-classroom-mcp-example}

[`examples/classroom-mcp`](https://github.com/falkenslab/pseudonym/tree/main/examples/classroom-mcp) es un pequeño servidor MCP sobre un curso inventado: seis estudiantes con sus notas y un foro cuyos mensajes contienen nombres, un teléfono, correos, un DNI y un IBAN. Todos los valores son inventados. Muestra cada parte de la librería donde la usaría un servidor real.

## Las herramientas {#the-tools}

| Herramienta | Lo que recibe el modelo | Llamada a la librería |
| --- | --- | --- |
| `list_students` | Cada estudiante como alias, con sus notas y su media | `remember()` con la lista completa |
| `read_forum` | Mensajes con los autores como alias y el texto redactado | `remember()` y luego `redact()` por mensaje |
| `student_summary` | Las notas de un estudiante, pedido por alias | `resolve()` |
| `grade_student` | Una nota puesta por alias | `resolve()` al identificador del LMS |

Toda la integración está en [`src/tools.ts`](https://github.com/falkenslab/pseudonym/blob/main/examples/classroom-mcp/src/tools.ts). Lo esencial:

```ts
const asPerson = (student: Student): Person => ({
  service: SERVICE,
  identifiers: { institutionalId: student.studentNumber, email: student.email, serviceUserId: student.lmsId },
  displayName: student.fullName,
});

/** Everyone's alias, in one call (one write to the directory), keyed by LMS id. */
async function aliases(): Promise<Map<string, string>> {
  const list = await remember(course.students.map(asPerson));
  return new Map(course.students.map((student, i) => [student.lmsId, list[i]!]));
}
```

Y el camino de vuelta, en `grade_student`:

```ts
// The model only knows the alias: resolve() turns it into the LMS id the write needs, on our side.
const found = byLmsId(await resolve(student, { service: SERVICE }));
```

## Lo que lee el modelo {#what-the-model-reads}

```json
[
  {
    "author": "A-9NQWD5",
    "date": "2026-10-01",
    "text": "Hola, soy A-9NQWD5. ¿Alguien hace la práctica 2 conmigo? Mi móvil es [PHONE_1] y mi correo [EMAIL_1]."
  },
  {
    "author": "A-TA8D1J",
    "date": "2026-10-01",
    "text": "Yo me apunto, A-9NQWD5. A-TA8D1J, del grupo B."
  },
  {
    "author": "A-Q30XC4",
    "date": "2026-10-04",
    "text": "Lucía, ¿me pasas tu parte? Firmado: A-Q30XC4."
  }
]
```

Hay dos estudiantes que se llaman Lucía, así que "Lucía" sola se queda: podría ser cualquiera de las dos. El nombre completo, "LUCÍA FERRÁNDIZ", se sustituye. Es [la regla de los nombres de pila](../guides/redaction.md#names-the-directorys-people).

Un alias que no existe vuelve como un error MCP que el modelo puede leer:

```text
Unknown alias A-000000: nobody with it is in the directory.
```

## Ejecútalo {#run-it}

```bash
npm install                      # at the repository's root: builds the library
cd examples/classroom-mcp
npm install
npm run demo                     # every tool's output, then the CLI commands to try
npm test                         # no tool output may contain any personal value
```

La demo guarda su clave y su directorio en `examples/classroom-mcp/.pseudonym/`, nunca en tu carpeta real, y termina mostrando los comandos `pseudonym` con los que puedes hacer de docente:

```powershell
$env:PSEUDONYM_HOME = "<the example's folder>\.pseudonym"
npx pseudonym whois A-9NQWD5
```

## Pruébalo con Claude Code {#try-it-with-claude-code}

```bash
npm run build
claude mcp add classroom -e PSEUDONYM_HOME=/abs/path/to/examples/classroom-mcp/.pseudonym -- node /abs/path/to/examples/classroom-mcp/dist/server.js
```

Ejecútalo con `node`, no con `npm start`: npm escribe en stdout, que es el protocolo MCP.

Después pide, por ejemplo: "Lista los estudiantes del aula, pon un 5 en el examen al que tenga la nota más baja en practice1 y resume de qué trata el foro".

Probamos exactamente eso con `claude -p`: el modelo solo vio alias, calificó a `A-4C2Z5W` y se fijó en el ambiguo "Lucía" como el único nombre que quedaba en el foro. `whois A-4C2Z5W` en ese directorio dio Pablo Lorente, que tenía la nota más baja. Mantén a tu agente lejos de la carpeta `.pseudonym/` del ejemplo y de la CLI igual que de las reales: consulta [Mantener a los agentes lejos de la clave](../security/keeping-agents-away.md).

## La prueba {#the-test}

[`test/tools.test.ts`](https://github.com/falkenslab/pseudonym/blob/main/examples/classroom-mcp/test/tools.test.ts) llama a cada herramienta a través de MCP, con un cliente en el mismo proceso y un `PSEUDONYM_HOME` nuevo por prueba, y comprueba que ninguna salida contiene ningún nombre, correo, número de estudiante, identificador del LMS, teléfono, DNI ni IBAN de los datos; que los alias son estables; que se califica al estudiante correcto, y que un alias desconocido es un error. Es el patrón descrito en [Probar tu integración](../guides/testing.md).
