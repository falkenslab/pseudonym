# Usar la librería sin código {#using-the-library-without-code}

Todo lo que un programa hace con la librería se puede hacer desde la línea de comandos: dar alias a las personas, convertir un alias de nuevo en un identificador y redactar texto. Es útil cuando trabajas con un modelo a mano, o desde un script de shell, sin escribir un programa.

## Carga tu clase {#load-your-class}

Para que [`redact`](redacting-and-revealing.md) conozca los nombres de tu alumnado, el directorio tiene que haberlos visto. Cárgalos desde un CSV, como una exportación de los participantes de tu LMS:

```text
Name,Email,Institutional ID,service_user_id,Group
Marta Quiroga,marta.q@school.example.org,2024-0031,4821,B
"Ferrándiz, Lucía",lucia.f@school.example.org,,4825,"B, mornings"
Hugo Estrella,,2024-0047,,A
```

```bash
pseudonym remember --csv class.csv --service class-2b > class-with-aliases.csv
```

- **Columnas que lee**, por su cabecera, sin distinguir mayúsculas, espacios, guiones ni guiones bajos: `name` (obligatoria), `email`, `institutional_id` y `service_user_id` (al menos una por fila). Son los [identificadores](../guides/concepts.md#identifiers) que usa la librería.
- **Las demás columnas** (grupo, notas, lo que sea) se conservan tal cual.
- **La salida** es el mismo CSV con una columna `alias` al principio. Sigue conteniendo nombres: es para ti.
- **El fichero entero entra en una sola llamada**, y no se recuerda nada si una fila está mal: un error indica la línea (nunca su contenido), para que la corrijas y lo vuelvas a ejecutar.
- `--csv -` lee stdin; sin `--service` usa el [servicio por defecto](overview.md#the-default-service).

## Seudonimiza una exportación para un modelo {#pseudonymize-an-export-for-a-model}

Añade `--only-aliases` y se descartan las columnas que identifican a alguien, dejando los alias y todo lo demás:

```bash
pseudonym remember --csv grades.csv --service class-2b --only-aliases > grades-for-the-model.csv
```

```text
alias,Group,Practice 1,Practice 2
A-9NQWD5,B,8.5,7
A-Q30XC4,"B, mornings",7.5,8
A-TA8D1J,A,6,5.5
```

Ese fichero puede ir a un modelo: dice quién hizo qué, con alias, y no contiene el nombre, el correo ni el identificador de nadie. Revisa tú las demás columnas: una columna de comentarios aún puede nombrar a personas (si es así, pásala por `pseudonym redact`).

La respuesta del modelo sobre `A-9NQWD5` se puede leer con nombres usando [`pseudonym reveal`](redacting-and-revealing.md#reveal-the-names-in-an-answer).

## Una persona {#one-person}

```bash
pseudonym remember --name "Marta Quiroga" --email marta.q@school.example.org --service-user-id 4821
```

imprime `A-9NQWD5`. Opciones: `--name` (obligatoria), `--email`, `--institutional-id`, `--service-user-id` (al menos una), `--service`, `--link` (un único alias entre servicios, consulta [enlace entre servicios](../guides/concepts.md#per-service-aliases-and-linking)) y `--json` para `{"alias": "A-9NQWD5"}`.

Recordar a alguien de nuevo da el mismo alias, igual que en la librería: una persona conserva su primer alias aunque cambie su correo.

## De un alias de vuelta a un identificador {#from-an-alias-back-to-an-id}

Un script que recibe un alias de un modelo y necesita actuar sobre esa persona en el LMS:

```bash
pseudonym resolve A-9NQWD5 --service class-2b
```

imprime `4821`, el `service_user_id` recordado para esa persona en ese servicio (los alias enlazados cuentan). Con `--json`: `{"alias": "A-9NQWD5", "service": "class-2b", "id": "4821"}`. Código de salida `2` si el directorio no conoce el alias, o no tiene identificador para él en ese servicio.

## En un script {#in-a-script}

```bash
#!/bin/sh
# Grades to a model as aliases, its answer back with names, for the teacher only.
export PSEUDONYM_SERVICE=class-2b
pseudonym remember --csv grades.csv --only-aliases > for-model.csv
ask-the-model --file for-model.csv "Who needs help, and why?" > answer.txt   # your own tool
pseudonym reveal < answer.txt
```

`remember`, `redact` y `reveal` imprimen los resultados en stdout y los mensajes en stderr, así que se combinan con tuberías. Ejecuta esos scripts tú, nunca a través de un agente: `reveal` y `resolve` deshacen los alias ([Mantener a los agentes lejos de la clave](../security/keeping-agents-away.md)).
