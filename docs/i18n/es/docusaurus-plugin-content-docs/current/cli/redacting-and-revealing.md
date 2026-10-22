# Redactar y revelar texto {#redacting-and-revealing-text}

Dos comandos para trabajar con un modelo a mano, sin un programa de por medio: `redact` deja un texto listo para pegarlo en un chat y `reveal` vuelve a poner los nombres en lo que responde el modelo.

## Redacta un texto antes de pegarlo {#redact-a-text-before-pasting-it}

```bash
pseudonym redact --service moodle@campus.example.org < submission.txt > safe.txt
pseudonym redact --service moodle@campus.example.org submission.txt
```

```text
$ pseudonym redact < post.txt
Hola, soy A-9NQWD5. Mi móvil es [PHONE_1] y mi correo [EMAIL_1].
pseudonym: Using the only service in the directory: moodle@campus.example.org.
pseudonym: Replaced 1 name, 1 email, 1 phone.
```

- Lee el fichero que le pases, o stdin si no hay ninguno (o es `-`), e imprime el texto en stdout, cambiado solo donde se reemplazó algo: los finales de línea y el salto de línea final quedan como estaban (consulta [acentos y codificaciones](#accents-and-encodings) para el texto que no está en UTF-8).
- Lo que reemplaza es exactamente lo que hace [`redact()`](../guides/redaction.md): las personas del directorio de ese servicio pasan a ser sus alias, y los correos, tarjetas de pago, IBAN y los identificadores y teléfonos de los países indicados pasan a ser marcadores. `--countries US,CA` elige los países (España por defecto; consulta [la tabla](../guides/redaction.md#by-country)). Los recuentos van a stderr, así que `> safe.txt` recibe solo el texto.
- Solo conoce los nombres de las personas que el directorio ha visto. Quien tus programas nunca recordaron se queda como está: lee el resultado antes de pegarlo.

### Acentos y codificaciones {#accents-and-encodings}

La salida es siempre UTF-8. La entrada también debería serlo, y normalmente lo es; cuando no, el comando lo avisa en stderr y la lee tal como la escribió Windows:

- el texto que llega por tubería desde `cmd` (`echo … | pseudonym redact`) está en la página de códigos de la consola, 850 en España o 437 en EE. UU.: se lee en esa página de códigos;
- un fichero guardado como "ANSI" por un editor antiguo es Windows-1252: se lee como tal.

Así, las letras acentuadas (`librería`, `Ñ`) salen bien en cualquier caso. Si un fichero UTF-8 tiene marca de orden de bytes, se descarta.

## Qué servicio usa {#which-service-it-uses}

Los nombres salen de las personas de un servicio. Cuando no dices cuál:

| Situación | Qué usa `redact` |
| --- | --- |
| Se indica `--service S` | Las personas de S; si el directorio no conoce S, ningún nombre (un aviso lista los servicios que conoce) |
| `PSEUDONYM_SERVICE` definida | Ese servicio, de la misma forma |
| El directorio tiene personas en `default` | `default` |
| El directorio tiene un solo servicio | Ese, indicado en stderr |
| El directorio tiene varios, ninguno `default` | Un error que los lista: elige uno con `--service` |
| El directorio está vacío | Ningún nombre, solo correos, teléfonos, identificadores e IBAN, con un aviso |

`pseudonym services` muestra lo que hay:

```text
$ pseudonym services
moodle@campus.example.org  28 people
mail@school.example.org  3 people
```

`--json` da lo mismo como `[{"service": "…", "people": 28}, …]`.

Todos los comandos que reciben un servicio usan el mismo valor por defecto: `--service`; si no, `PSEUDONYM_SERVICE`; y si tampoco, `default`. Define `PSEUDONYM_SERVICE` en el perfil de tu shell si siempre trabajas con uno.

## Revela los nombres en una respuesta {#reveal-the-names-in-an-answer}

El modelo responde sobre alias ("A-9NQWD5 no ha entregado la práctica 2"). Para leerlo con nombres:

```bash
pseudonym reveal < answer.txt
pseudonym reveal --with-alias answer.txt
```

```text
$ pseudonym reveal --with-alias < answer.txt
Marta Quiroga (A-9NQWD5) hasn't handed in practice 2.
pseudonym: Revealed 1 alias.
pseudonym: The output holds names in clear: never paste it back to a model, nor where an agent can read it.
```

- Cada alias que conoce el directorio pasa a ser el nombre de la persona, `Name (A-…)` con `--with-alias`. Los alias [enlazados](tidying-the-directory.md#link-two-aliases) con otro también cuentan. No hace falta servicio: los alias son únicos en el directorio.
- Los alias se buscan como palabras completas y sin distinguir mayúsculas (`a-9nqwd5` funciona). Un alias que el directorio no conoce se queda como está, y se cuenta en stderr.
- Los marcadores como `[EMAIL_1]` se quedan: sus valores no se guardan en ningún sitio, así que no se pueden deshacer.

**Su salida contiene nombres en claro.** Léela tú; nunca la pegues de vuelta en el chat y no la dejes donde un agente pueda leerla.

## Códigos de salida {#exit-codes}

Ambos terminan con `0` cuando acaban, aunque no hubiera nada que reemplazar, y con `1` ante un error (un fichero que no se puede leer, una opción desconocida, varios servicios y ninguno elegido), sin nada en stdout.
