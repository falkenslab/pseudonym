# Integración {#integrating-it}

Esta guía usa un servidor MCP como ejemplo, porque es el caso para el que se escribió la librería ([Model Context Protocol](https://modelcontextprotocol.io)); lo mismo vale para cualquier programa que envíe datos de personas a un modelo. [El ejemplo del aula](../example/classroom-mcp.md) lo tiene todo funcionando.

## 1. Elige el servicio {#1-choose-the-service}

Una cadena por instancia de fuente de datos, estable en el tiempo:

```ts
const service = `moodle@${new URL(siteUrl).host}`;
```

## 2. Pasa a cada persona por `remember()` donde construyes los resultados {#2-pass-every-person-through-remember-where-you-build-results}

Hazlo en el punto en que tu herramienta convierte la respuesta de tu fuente de datos en lo que leerá el modelo, antes de serializar nada:

```ts
import { remember, type Person } from "@falkenslab/pseudonym";

const asPerson = (user: MoodleUser): Person => ({
  service,
  identifiers: {
    institutionalId: user.idnumber || undefined, // empty strings are ignored anyway
    email: user.email,
    serviceUserId: String(user.id),
  },
  displayName: user.fullname,
});

// One call for the whole list: the directory is written once.
const aliases = await remember(participants.map(asPerson));

return participants.map((user, i) => ({
  student: aliases[i],
  lastAccess: user.lastaccess,
  grade: gradeOf(user),
}));
```

- **Pasa una lista** cuando tengas varias personas: `remember(people)` devuelve los alias en el mismo orden y escribe el directorio una sola vez. Llamarla una vez por persona funciona, pero cada llamada bloquea, lee y reescribe el fichero.
- **Pasa `serviceUserId`** siempre que una herramienta pueda necesitar actuar sobre la persona más adelante: es lo que devuelve `resolve()`.
- **No dejes nada más.** Todo campo que identifique a alguien (nombre, correo, URL del avatar, enlace al perfil, un nombre de usuario en una URL) debe quitarse o sustituirse. La librería solo sustituye lo que pasas por ella.

Si los identificadores que pasas apuntan a dos personas distintas que ya están en el directorio (por ejemplo, un correo que pertenecía a otra persona), gana el identificador más fuerte, no se fusiona a nadie y la librería emite un aviso de proceso con ambos alias (nunca los identificadores):

```ts
process.on("warning", (warning) => {
  if (warning.name === "PseudonymWarning") log(warning.message);
});
```

## 3. Recupera los alias con `resolve()` {#3-take-aliases-back-with-resolve}

Una herramienta de escritura recibe un alias del modelo y necesita tu propio identificador:

```ts
import { resolve, PseudonymError } from "@falkenslab/pseudonym";

async function gradeStudent({ student, grade }: { student: string; grade: number }) {
  try {
    const userId = await resolve(student, { service });
    await moodle.setGrade(Number(userId), grade);
    return { student, grade };
  } catch (error) {
    if (error instanceof PseudonymError) return { isError: true, content: [{ type: "text", text: error.message }] };
    throw error;
  }
}
```

- `resolve()` sigue los alias [enlazados](../cli/tidying-the-directory.md#link-two-aliases) por la persona responsable.
- Lanza un `PseudonymError` ante un alias desconocido, o uno sin identificador para ese servicio. Su mensaje nunca contiene un identificador, así que es seguro devolvérselo al modelo, que puede corregirse.
- **Guarda su resultado de tu lado.** Responde al modelo con el alias, nunca con el identificador.

## 4. Redacta el texto libre {#4-redact-free-text}

Las entregas, los mensajes de foro y los mensajes llevan nombres y datos de contacto en su texto. Primero recuerda a las personas del contexto (el directorio solo conoce los nombres que ha visto) y después redacta:

```ts
const aliases = await remember(participants.map(asPerson));
const { text } = await redact(post.message, { service });
```

Consulta [Redactar texto libre](redaction.md) para saber qué sustituye y qué no puede.

## 5. Decide qué ve la persona {#5-decide-what-the-person-sees}

Los alias son para el modelo. La interfaz propia de tu programa puede seguir mostrando nombres reales a la persona: es decisión tuya (moodle-mcp se los muestra al profesor). La persona siempre puede resolver un alias con `pseudonym whois`.

## 6. Gestiona los errores {#6-handle-errors}

Todo error sobre el que la persona puede actuar es un `PseudonymError` cuyo mensaje dice qué hacer:

| Situación | Qué hacer |
| --- | --- |
| Falta la clave después de haberse usado aquí | La persona la restaura con `pseudonym key import` |
| La clave está dañada (tamaño incorrecto) | Lo mismo |
| El directorio no se puede leer (otra clave, o el fichero se modificó) | No se ha cambiado nada; restaura la clave correcta |
| El directorio lo escribió una versión más reciente | Actualiza la librería |
| Otro programa mantiene el bloqueo del directorio durante más de 15 s | Inténtalo de nuevo; un bloqueo dejado por un fallo se rompe a los 10 s |
| Un alias desconocido, o uno sin identificador para el servicio | Díselo al modelo (`resolve`) |
| Una persona sin ningún identificador, servicio o nombre visible | Un error del programa que llama |

Muéstraselos a la persona o al modelo; no los reintentes en bucle.

## 7. Documenta lo que envías {#7-document-what-you-send}

En tu propio README, cuéntales a tus usuarios:

- qué campos llegan al modelo, y que las personas van como alias;
- que es seudonimización (art. 4(5) del RGPD), no anonimización;
- lo que la redacción no detecta (direcciones, fechas de nacimiento, personas fuera del directorio);
- cómo mantener a su agente lejos de la clave y de la CLI: enlaza a [Mantener a los agentes lejos de la clave](../security/keeping-agents-away.md).

## No imprime nada {#nothing-prints}

La librería nunca escribe en stdout ni en stderr (dentro de un servidor MCP, stdout es el protocolo). La única salida, aparte de los valores devueltos y los errores, es el `PseudonymWarning` de arriba.
