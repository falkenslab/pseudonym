# Conceptos {#concepts}

## Servicio {#service}

Una cadena que nombra dónde conoció tu programa a una persona: `moodle@campus.example.org`, `mail@school.example.org`. La eliges tú, y debe nombrar la instancia, no solo el producto: dos sitios Moodle son dos servicios.

Mantenla estable. Forma parte de cada alias (salvo que el enlace esté activado) y es la clave con la que el directorio guarda el identificador de servicio de cada persona: cambiarla da a todo el mundo alias nuevos en ese servicio.

## Identificadores {#identifiers}

Lo que nombra a una persona en un servicio. Pasa todos los que tengas:

| Identificador | Qué es | Se normaliza como |
| --- | --- | --- |
| `institutionalId` | Un identificador que la institución da a la persona, el mismo en todos los servicios: un número de estudiante, un número de personal, un DNI | Sin espacios alrededor, en mayúsculas, sin espacios ni guiones: `12345678-z` y `12345678 Z` son `12345678Z` |
| `email` | Su dirección de correo | Sin espacios alrededor, en minúsculas |
| `serviceUserId` | El identificador propio del servicio para esa persona: un id de usuario de Moodle | Sin espacios alrededor |

El **más fuerte** de los presentes (en ese orden) genera el alias, porque es el que más probablemente se mantenga igual entre servicios y con el tiempo. Todos ellos permiten al directorio reconocer a la persona más adelante.

La normalización forma parte de cada alias: es fija, y cambiarla en una versión futura sería un cambio incompatible.

## Alias {#alias}

`A-` más 6 caracteres en [base32 de Crockford](https://www.crockford.com/base32.html) (`0-9` y `A-Z` sin `I`, `L`, `O` ni `U`, para que una persona o un modelo lo copie sin confundir caracteres): `A-7K3F9Q`.

En el raro caso de que dos personas obtengan los mismos 6 caracteres, la segunda recibe un alias de 7 caracteres (`A-7K3F9QX`), que extiende el mismo prefijo. Trata los alias como cadenas opacas; para comprobar su forma en un test, usa `/^A-[0-9A-HJKMNP-TV-Z]{6,12}$/`.

Los alias no distinguen mayúsculas de minúsculas allí donde la librería los recibe de vuelta (`resolve`, `pseudonym whois`): `a-7k3f9q` funciona.

## Directorio {#directory}

Un fichero local con las personas que ha conocido tu programa, cifrado por defecto (también puede ser [JSON plano](storage.md), sin clave), compartido por todos los programas del equipo que usan la librería. De cada persona guarda:

- su alias, y cualquier alias [enlazado](../cli/tidying-the-directory.md#link-two-aliases) con él;
- su nombre visible (lo que muestra `pseudonym whois`);
- sus identificadores de servicio: para cada servicio, el `serviceUserId` que pasaste;
- matchers (huellas con clave del identificador): hashes con clave de su correo y de su identificador institucional, nunca los identificadores en sí;
- cuándo se la vio por primera y por última vez.

Gracias a él, una persona conserva su **primer alias** cuando cambia un identificador: un estudiante al que le dan un correo nuevo se reconoce por su id de usuario de Moodle y conserva `A-7K3F9Q`. Y la persona responsable puede resolver alias sin conexión, sin tu fuente de datos.

## Alias por servicio y enlace {#per-service-aliases-and-linking}

Por defecto, el servicio entra en el alias, y el directorio solo empareja personas dentro del mismo servicio. El mismo estudiante es `A-7K3F9Q` en Moodle y `A-M2X8RD` en el correo, así que un modelo que vea ambos no puede unir lo que sabe de él: reunir calificaciones, correo y horario bajo un mismo alias es lo que más facilita volver a identificar a alguien.

Si tu programa necesita de verdad un único alias entre servicios, activa el **enlace**: `remember({ ..., link: true })`, o `PSEUDONYM_LINK=true` para todas las llamadas que no indiquen nada. Entonces el servicio queda fuera del alias, y una persona encontrada en otro servicio con el mismo identificador recibe el mismo alias. Está desactivado por defecto a propósito; consulta [El RGPD y el marco legal](../security/gdpr.md).

## La clave {#the-key}

32 bytes aleatorios en la carpeta compartida, creados en el primer uso. Todo deriva de ella: los alias, el cifrado del directorio, los matchers, la huella. Dos equipos con la misma clave dan a las mismas personas los mismos alias.

Perderla supone perder cualquier camino de vuelta, por diseño: los alias no se pueden resolver y el directorio no se puede leer. La persona responsable hace una copia de seguridad una vez con [`pseudonym key export`](../cli/the-key.md).
