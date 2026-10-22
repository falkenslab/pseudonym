# Ordenar el directorio {#tidying-the-directory}

## Enlaza dos alias {#link-two-aliases}

A veces una persona acaba con dos alias: se la vio en dos servicios sin enlace, o con un identificador que el directorio no pudo relacionar con ella (un correo personal en un sitio, el del centro en otro). Cuando sabes que son la misma persona:

```text
$ pseudonym link A-7K3F9Q A-M2X8RD
A-7K3F9Q kept; A-M2X8RD now resolves to it.
```

- Se conserva el **primer** alias. El segundo no se pierde: `whois`, `resolve()` y la búsqueda de coincidencias en datos nuevos llevan todos a la entrada conservada.
- Las entradas se fusionan: servicios, identificadores, matchers, y la primera fecha de aparición más temprana y la última más reciente.
- A partir de entonces, los programas obtienen el alias conservado para esa persona, en todos los servicios que tenía la entrada fusionada.
- Si algún alias es desconocido: código de salida `2`, y no cambia nada.

Enlazar dos alias une lo que un modelo pueda saber de la persona bajo ellos a partir de ahora. Hazlo cuando la persona responsable necesite una visión única de esa persona, no por defecto (consulta [El RGPD y el marco legal](../security/gdpr.md)).

## Olvida a una persona {#forget-a-person}

Para una solicitud de supresión, o alguien que ya no debería estar:

```text
$ pseudonym forget A-7K3F9Q
Forgot A-7K3F9Q.
```

- Se elimina la entrada: nombre, identificadores del servicio, matchers.
- Si un programa vuelve a ver a la persona, recibe **el mismo alias de nuevo**, recalculado a partir de su identificador con la clave. Lo único que se perdió entretanto fue la consulta sin conexión.
- Un alias desconocido: código de salida `2`.

Olvidar elimina a la persona del directorio, no de los datos que tus programas o el proveedor del modelo ya puedan tener. Es una parte de una solicitud de supresión, no toda.

## Olvida un servicio entero {#forget-a-whole-service}

Cuando se cierra un curso, o dejas de usar un programa:

```text
$ pseudonym forget --service moodle@campus.example.org
This removes the 28 people met in moodle@campus.example.org and can't be undone. Type moodle@campus.example.org to confirm: moodle@campus.example.org
Forgot moodle@campus.example.org: removed 27 people; 1 person also met in other services kept.
```

- Se eliminan las personas vistas **solo** en ese servicio.
- Las personas vistas también en otros servicios (con [enlace entre servicios](../guides/concepts.md#per-service-aliases-and-linking), o [enlazadas](#link-two-aliases) por ti) conservan su entrada y su alias, sin el identificador de ese servicio.
- `pseudonym services` muestra qué servicios hay y cuántas personas tiene cada uno. Un servicio que el directorio no conoce: código de salida `2`, no cambia nada.

## Olvida a todo el mundo {#forget-everyone}

```bash
pseudonym forget --all
```

Vacía el directorio, después de que escribas `all` para confirmar. **La clave se queda**: cualquiera que se vuelva a ver recibe el mismo alias que antes, recalculado. Para empezar de cero con alias nuevos para todos, borra la carpeta entera (consulta [Si la clave se pierde para siempre](the-key.md#if-the-key-is-lost-for-good)).

## Confirmar sin terminal {#confirming-without-a-terminal}

Ambos te piden escribir el nombre del servicio (o `all`), porque no se pueden deshacer. En un script, donde no hay terminal a la que preguntar, añade `--yes`; sin él, terminan con el código `1` y no cambian nada.

## Elimina a quienes llevan tiempo sin aparecer {#remove-people-not-seen-for-a-while}

Para un límite de conservación:

```text
$ pseudonym prune --older-than 2y
Removed 14 people.
```

- `--older-than` recibe un número y `d` (días), `m` (meses) o `y` (años): `90d`, `6m`, `2y`.
- Elimina a todas las personas cuya última aparición sea anterior a eso. "Aparecer" significa que un programa llamó a `remember()` con ellas.
- Igual que con `forget`, reciben el mismo alias si se las vuelve a ver.

Una política habitual: depurar una vez al año, cuando se han cerrado los cursos de ese año.
