# Resolver alias {#resolving-aliases}

## Quién es un alias {#who-is-an-alias}

```text
$ pseudonym whois A-7K3F9Q
Ana Pérez
  alias A-7K3F9Q
  services moodle@campus.example.org
  first seen 2026-10-09T18:02:11.000Z, last seen 2026-10-09T19:40:05.000Z
```

- La primera línea es el nombre visible, solo, para que un script pueda tomarlo con `head -1`.
- Los alias no distinguen mayúsculas de minúsculas: `pseudonym whois a-7k3f9q` funciona.
- Un alias que se [enlazó](tidying-the-directory.md#link-two-aliases) con otro muestra la persona a la que ahora resuelve, con `(also A-…)` tras el alias.
- Un alias desconocido imprime un mensaje en stderr y termina con el código `2`.

El directorio solo conoce a las personas que tus programas han visto en esta máquina (o en una máquina cuyo directorio copiaste). No necesita el programa ni su fuente de datos: funciona sin conexión.

## Los alias de una persona {#the-aliases-of-a-person}

```text
$ pseudonym alias "ana perez"
A-7K3F9Q  Ana Pérez  (moodle@campus.example.org)
A-M2X8RD  Ana Pérez  (mail@school.example.org)
```

- Todas las personas cuyo nombre visible **contiene** lo que escribes, sin distinguir mayúsculas ni acentos: `alias lucia` lista a todas las Lucías.
- Una línea por persona: alias, nombre y los servicios donde se la vio. La misma persona en dos servicios suele tener dos alias (consulta [alias por servicio](../guides/concepts.md#per-service-aliases-and-linking)).
- Si nadie coincide: código de salida `2`.

## Un servicio entero de una vez {#a-whole-service-at-once}

Para cruzar los alias con otra cosa (una exportación de calificaciones, una lista que produjo el modelo), obtén las personas de un servicio en CSV:

```bash
pseudonym aliases --service moodle@campus.example.org > people.csv
```

Sin `--service`, usa el [servicio por defecto](overview.md#the-default-service).

```text
alias,name
A-7K3F9Q,Ana Pérez
A-TA8D1J,Hugo Estrella
A-Q30XC4,"Ferrándiz, Lucía"
```

El CSV va a stdout y un aviso a stderr: la librería nunca escribe nombres en un fichero por sí misma, así que el fichero existe solo porque tú lo redirigiste. **Contiene nombres en claro**: mantenlo lejos de los agentes (y fuera de cualquier carpeta que un agente pueda leer), y bórralo cuando termines.
