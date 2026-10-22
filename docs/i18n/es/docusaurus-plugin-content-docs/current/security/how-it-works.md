# Cómo funciona por dentro {#how-it-works-inside}

Todo usa [`node:crypto`](https://nodejs.org/api/crypto.html) con construcciones estándar; no hay dependencias en tiempo de ejecución ni esquemas caseros.

## La clave y sus subclaves {#the-key-and-its-subkeys}

La clave son 32 bytes aleatorios (`randomBytes`), creados en el primer uso. Nunca se usa directamente: se deriva una subclave por cada propósito con **[HKDF-SHA256](https://www.rfc-editor.org/rfc/rfc5869)**, sin sal, con `info` `pseudonym/<purpose>`:

| Subclave | Se usa para |
| --- | --- |
| `pseudonym/aliases` | Calcular los alias |
| `pseudonym/directory` | Cifrar el directorio |
| `pseudonym/matchers` | Los hashes de identificadores del directorio |
| `pseudonym/fingerprint` | La huella de la clave |

La huella son los 8 primeros caracteres en base32 de Crockford de su subclave: identifica la clave y no revela nada sobre ella ni sobre las demás subclaves.

### Crearla de forma segura {#creating-it-safely}

Varios programas pueden arrancar a la vez en una máquina recién instalada. La clave se escribe en un archivo temporal y se crea un **enlace duro** a `key`: el enlace falla si `key` ya existe, así que todos los procesos acaban leyendo la misma clave completa, nunca una a medio escribir. Después se escribe un marcador `used` vacío.

Ese marcador es lo que hace que la librería **falle de forma segura**: si existe y la clave no, es que aquí hubo una clave y se ha perdido, y la librería se niega a funcionar (remitiendo a `pseudonym key import`) en lugar de crear una clave nueva que daría a todo el mundo alias nuevos sin avisar.

## Alias {#aliases}

```text
alias = "A-" + base32(HMAC-SHA256(aliasesKey, JSON.stringify([service, kind, value])))[0..6]
```

- `kind` y `value` son el identificador más fuerte presente y su tipo (`institutionalId`, `email` o `serviceUserId`), [normalizado](../guides/concepts.md#identifiers). El tipo forma parte de la entrada para que un identificador institucional `7` y un identificador de usuario del servicio `7` den alias distintos.
- Con el enlace entre servicios activado, el servicio se omite: `JSON.stringify([kind, value])`.
- El base32 usa [el alfabeto de Crockford](https://www.crockford.com/base32.html) (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), en mayúsculas.
- 6 caracteres son 30 bits: una colisión es improbable por debajo de decenas de miles de personas en un servicio. Cuando el directorio ya tiene ese alias para otra persona, la recién llegada recibe 7 caracteres (y así sucesivamente), que amplían el mismo prefijo.

El array JSON hace que la entrada no sea ambigua: ningún servicio y valor pueden partirse de otra forma para dar los mismos bytes.

## El directorio {#the-directory}

Un archivo, `directory.enc`:

```text
"PSEUDONYM-DIRECTORY" | version (1 byte) | nonce (12 bytes) | GCM tag (16 bytes) | ciphertext
```

- **AES-256-GCM** ([NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final)) con la subclave del directorio, con un nonce aleatorio nuevo en cada escritura.
- La cadena mágica y la versión se autentican como datos adicionales: modificar la cabecera falla igual que modificar el cuerpo.
- El texto en claro es JSON: una entrada por persona con su alias, nombre visible, identificadores del servicio, matchers, alias enlazados y fechas de primera y última aparición.
- Los **matchers** (huellas con clave de los identificadores) son [HMAC-SHA256](https://www.rfc-editor.org/rfc/rfc2104) de `[kind, value]` con la subclave de matchers, para el correo y el identificador institucional: permiten al directorio reconocer a una persona por un identificador sin guardarlo. El nombre visible y los identificadores de usuario del servicio sí se guardan, dentro del cifrado, porque `whois` y `resolve()` los necesitan.

Una clave incorrecta, un archivo modificado o una versión desconocida hacen que toda lectura lance un `PseudonymError` y dejan el archivo intacto.

### Programas concurrentes {#concurrent-programs}

Todos los programas de la máquina comparten el archivo:

- **Las escrituras** toman `directory.lock` (creado en exclusiva), leen el archivo, lo modifican, escriben la nueva versión en un archivo temporal y lo **renombran** sobre el anterior, y luego liberan el bloqueo. Un bloqueo de más de 10 segundos se considera abandonado por un fallo y se rompe; un programa que espera más de 15 segundos desiste con un `PseudonymError`. En Windows, el renombrado se reintenta mientras otro proceso (un antivirus, un lector) tiene el archivo abierto.
- **Las lecturas** no toman bloqueo: el renombrado sustituye el archivo entero, así que un lector siempre ve una versión completa.
- Un fallo entre la escritura y el renombrado deja un archivo temporal suelto y el directorio anterior intacto.

## Reconocer a las personas {#matching-people}

`remember()` busca a una persona con cada identificador, del más fuerte al más débil:

- el identificador institucional y el correo, por matcher;
- el identificador de usuario del servicio, entre los identificadores de ese servicio.

Sin enlace entre servicios, solo cuentan las entradas ya vistas **en ese servicio**, así que el mismo correo en otro servicio recibe otro alias. Con enlace, cuenta cualquier entrada, empezando por la más antigua.

Gana la primera coincidencia. Si un identificador más débil apunta a otra entrada, las entradas nunca se fusionan (pueden ser dos personas) y un `PseudonymWarning` nombra ambos alias. Una coincidencia actualiza el nombre, el identificador del servicio y la fecha de última aparición de la entrada, y aprende los identificadores que no conocía (un correo nuevo).

## Redacción {#redaction}

Los nombres se buscan en una copia **plegada** del texto: cada unidad UTF-16 en minúsculas y sin tilde, de modo que la copia tiene exactamente la misma longitud y cada coincidencia está en la misma posición que en el original. Los límites de palabra son lookarounds sobre letras y dígitos Unicode, porque `\b` solo entiende ASCII en JavaScript incluso con la bandera `u`. Después se aplican los patrones de `src/patterns.ts` en un orden fijo (correos, IBAN, tarjetas, documentos nacionales de identidad y, al final, teléfonos, para que un patrón de teléfono nunca se quede con los grupos de dígitos de otro valor), solo los de los países pedidos, y cada valor se valida (Luhn, módulo 97, letras y dígitos de control, rangos emitidos) antes de sustituirlo. Consulta [Redactar texto libre](../guides/redaction.md).

## La entrada de la clave en la CLI {#the-clis-key-input}

`pseudonym key import` lee de stdin. En un terminal pasa a modo raw y lee tecla a tecla sin mostrar nada: Intro termina, Retroceso borra, Ctrl+C cancela, y las secuencias de escape (flechas, marcadores de pegado entre corchetes) se descartan para que nunca acaben en la clave.
