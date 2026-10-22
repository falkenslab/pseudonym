# Referencia de comandos {#command-reference}

| Comando | Qué hace | Códigos de salida |
| --- | --- | --- |
| `pseudonym whois <alias>` | Quién es un alias: nombre, alias y los enlazados, servicios, primera y última aparición | `0`, `2` alias desconocido |
| `pseudonym alias "<name>"` | Todas las personas cuyo nombre lo contiene (sin distinguir mayúsculas ni acentos), con sus alias y servicios | `0`, `2` nadie |
| `pseudonym aliases [--service <service>]` | Las personas de un servicio en CSV (`alias,name`) en stdout, un aviso en stderr | `0` |
| `pseudonym services [--json]` | Los servicios del directorio y cuántas personas tiene cada uno | `0` |
| `pseudonym redact [--service <service>] [--countries ES,US,…] [file]` | El texto (fichero o stdin) con las personas del servicio como alias y los datos de contacto como marcadores (tarjetas, IBAN, e identificadores y teléfonos de los países indicados, España por defecto); recuentos en stderr | `0`, `1` varios servicios y ninguno elegido, país desconocido, fichero ilegible |
| `pseudonym reveal [--with-alias] [file]` | El texto (fichero o stdin) con cada alias conocido sustituido por el nombre de la persona | `0`, `1` fichero ilegible |
| `pseudonym remember --name <name> [--email …] [--institutional-id …] [--service-user-id …]` | El alias de una persona (también `--service`, `--link`, `--json`) | `0`, `1` sin nombre o sin identificador |
| `pseudonym remember --csv <file> [--only-aliases]` | Alias para un CSV entero, como un CSV con una columna `alias` al principio (`--only-aliases` descarta nombres e identificadores); también `--json` | `0`, `1` una fila sin nombre o sin identificador |
| `pseudonym resolve <alias> [--service <service>]` | El identificador de usuario del servicio detrás de un alias (también `--json`) | `0`, `2` alias desconocido o sin identificador en ese servicio |
| `pseudonym link <alias> <alias>` | La misma persona: conserva el primer alias, el segundo resuelve a él | `0`, `2` alias desconocido |
| `pseudonym forget <alias>` | Elimina a una persona del directorio | `0`, `2` alias desconocido |
| `pseudonym forget --service <service> [--yes]` | Elimina a las personas vistas solo en ese servicio; las demás pierden su identificador. Pide confirmación | `0`, `1` sin confirmar, `2` servicio desconocido |
| `pseudonym forget --all [--yes]` | Vacía el directorio, conservando la clave. Pide confirmación | `0`, `1` sin confirmar |
| `pseudonym prune --older-than <n>(d\|m\|y)` | Elimina a las personas que llevan ese tiempo sin aparecer | `0`, `1` antigüedad no válida |
| `pseudonym key fingerprint` | Un código corto de la clave | `0`, `2` todavía no hay clave |
| `pseudonym key export` | La clave en base64 en stdout, un aviso en stderr | `0`, `2` todavía no hay clave |
| `pseudonym key import` | Lee una clave de stdin (oculta en una terminal) | `0`, `1` clave distinta o no es una clave |
| `pseudonym key import --force` | Sustituye una clave distinta, conservando el directorio actual como `.bak` | `0`, `1` no es una clave |
| `pseudonym help` | La lista de comandos | `0` |

Todos los comandos terminan con `1` ante un error, con un mensaje en stderr que dice qué hacer: una clave ausente o dañada, un directorio que no se puede leer, un argumento que falta, un comando desconocido.

## Entorno {#environment}

| Variable | Efecto |
| --- | --- |
| `PSEUDONYM_HOME` | La carpeta de la clave y el directorio, en lugar de `%APPDATA%\pseudonym\` o `~/.config/pseudonym/` |
| `PSEUDONYM_SERVICE` | El servicio para los comandos que reciben uno cuando no se indica `--service`, en lugar de `default` |

## Ficheros de la carpeta {#files-in-the-folder}

| Fichero | Qué es |
| --- | --- |
| `key` | La clave: 32 bytes aleatorios |
| `used` | Una marca vacía: aquí existió una clave, así que si falta es una pérdida, no una primera ejecución |
| `directory.enc` | El directorio, cifrado |
| `directory.lock` | Presente solo mientras un programa está modificando el directorio |
| `directory.enc.<date>.bak` | El directorio anterior, tras `key import --force` |

Consulta [Cómo funciona](../security/how-it-works.md) para saber qué contienen.
