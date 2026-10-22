# Redactar texto libre {#redacting-free-text}

`redact(text, { service, countries? })` es para texto que escribe la gente: entregas, mensajes de foro, mensajes. Devuelve el texto con las personas conocidas sustituidas por sus alias y los datos de contacto e identidad sustituidos por marcadores, además de cuántos de cada tipo ha sustituido:

```ts
const { text, replaced } = await redact("Hola, soy Marta Quiroga. Mi móvil es 612 345 678.", { service });
// text:     "Hola, soy A-9NQWD5. Mi móvil es [PHONE_1]."
// replaced: { names: 1, emails: 0, phones: 1, ids: 0, ibans: 0, cards: 0 }
```

`replaced` contiene recuentos, nunca valores, así que es seguro registrarlo en logs. Los documentos nacionales de todos los países cuentan en `ids`.

## Nombres: las personas del directorio {#names-the-directorys-people}

Primero, los nombres visibles de las personas del directorio **para ese servicio** se convierten en sus alias. Recuerda a las personas de un contexto (un curso, un foro) antes de redactar sus textos, o sus nombres no se conocerán.

- **Los nombres completos** se buscan sin distinguir mayúsculas ni tildes, como palabras completas: "LUCÍA ferrandiz" es Lucía Ferrándiz; "Ana" no se encuentra dentro de "Banana".
- **Un nombre de pila solo** ("como dijo Lucía") se sustituye únicamente cuando exactamente **una** persona de ese servicio lo tiene **y** el texto lo escribe con inicial mayúscula ("Lucía", "LUCÍA", no "lucía"). Así las palabras comunes quedan a salvo ("el mar" se queda tal cual aunque haya una Mar López en el directorio) y nunca se pone un alias a la persona equivocada.
- **Un nombre completo que comparten dos personas** se deja tal cual, por la misma razón: el alias equivocado atribuiría a una persona lo que escribió otra, que es peor que dejar un nombre.
- Ganan los nombres más largos: "Lucía Ferrándiz" se sustituye entero, no como "Lucía" más un apellido.

## Datos de contacto e identidad: patrones verificados {#contact-and-identity-data-checked-patterns}

Después, los valores que se pueden **verificar**: un dígito de control donde el valor lo tiene o, donde no, separadores obligatorios y rangos que nunca se emiten. Los valores sin ninguna de las dos cosas se dejan fuera (consulta [más abajo](#left-out-on-purpose)).

### Siempre {#always}

| Tipo | Ejemplo | Se verifica con | Marcador |
| --- | --- | --- | --- |
| Correo | `marta.q@mail.example.test` | Su forma | `[EMAIL_n]` |
| IBAN, de cualquier país | `ES91 2100 0418 4502 0005 1332`, `GB82WEST12345698765432` | La longitud del país en el registro IBAN y el módulo 97 de [ISO 13616](https://en.wikipedia.org/wiki/International_Bank_Account_Number) | `[IBAN_n]` |
| Tarjeta de pago | `4111 1111 1111 1111`, `3782-822463-10005` | Prefijo del emisor y longitud (Visa, Mastercard, Amex, Discover, Diners, JCB, UnionPay), el mismo separador en todo el número y el [algoritmo de Luhn](https://en.wikipedia.org/wiki/Luhn_algorithm) | `[CARD_n]` |

### Por país {#by-country}

Pasa los países cuya gente escribe los textos, como códigos ISO, en mayúsculas o minúsculas:

```ts
await redact(text, { service, countries: ["US", "CA"] });
```

El valor por defecto es `["ES"]`. Un código desconocido lanza un `PseudonymError`.

| País | Tipo | Ejemplo | Se verifica con | Marcador |
| --- | --- | --- | --- | --- |
| `ES` España | DNI | `48392017V`, `48392017-V` | La letra de control (número mod 23) | `[DNI_n]` |
| `ES` | NIE | `X1234567L` | La letra de control, con X, Y, Z como 0, 1, 2 | `[NIE_n]` |
| `ES` | Número de la Seguridad Social | `28/12345678/40` | Provincia 01-53, control = número mod 97 | `[ES_NSS_n]` |
| `ES` | Teléfono | `612 345 678`, `+34 91 568 04 06` | Nueve dígitos una vez quitado `+34` | `[PHONE_n]` |
| `US` Estados Unidos | SSN | `123-45-6789` | Solo con `-` o espacios; área distinta de 000, 666 y 900-999, grupo distinto de 00, serie distinta de 0000 | `[US_SSN_n]` |
| `US` | ITIN | `912-78-1234` | Solo con separadores; 9XX y los rangos de grupo emitidos | `[US_ITIN_n]` |
| `US`, `CA` | Teléfono | `(212) 555-0147`, `212-555-0147`, `+1 212 555 0147` | Paréntesis, separadores o `+1`; el código de área y el de central empiezan por 2-9 | `[PHONE_n]` |
| `CA` Canadá | SIN | `046 454 286`, `046-454-286` | Solo con separadores; Luhn; nunca empieza por 0 ni por 8 | `[CA_SIN_n]` |
| `DE` Alemania | Steuer-ID | `12 345 678 903` | ISO 7064 MOD 11,10 y un dígito repetido en los diez primeros | `[DE_TAXID_n]` |
| `DE` | Número del Personalausweis | `L01X00T471` | Dígito de control con pesos 7-3-1 | `[DE_IDCARD_n]` |
| `DE` | Rentenversicherungsnummer | `65 170839 J 003` | Una fecha de nacimiento válida y su dígito de control | `[DE_SVNR_n]` |
| `DE` | Krankenversichertennummer | `A123456780` | Su dígito de control | `[DE_KVNR_n]` |
| `MX` México | CURP | `GODE561231HDFRRN09` | Su estructura y dígito de control | `[MX_CURP_n]` |
| `CL` Chile | RUT | `12.345.678-5` | Mod 11, `K` para 10 | `[CL_RUT_n]` |
| `AR` Argentina | CUIL/CUIT | `20-12345678-6` | Prefijo válido y mod 11 | `[AR_CUIT_n]` |
| `BR` Brasil | CPF | `123.456.789-09` | Los dos dígitos mod 11; nunca todos los dígitos iguales | `[BR_CPF_n]` |
| `PT` Portugal | NIF | `123456789` | Primer dígito válido y mod 11 | `[PT_NIF_n]` |

Los ejemplos muestran los formatos; no todos tienen dígitos de control válidos.

Dentro de una misma llamada, el mismo valor recibe el mismo marcador aunque se escriba de forma distinta (`612 345 678` y `+34 612345678` son ambos `[PHONE_1]`), y la numeración vuelve a empezar en la siguiente llamada: `[EMAIL_1]` en dos mensajes pueden ser dos direcciones distintas. Los marcadores no se pueden resolver: a diferencia de los alias, los valores no se guardan en ningún sitio.

Las verificaciones dejan fuera los números que solo parecen documentos: `12345678A` se queda, porque A no es su letra, y `666-12-3456` se queda, porque ningún SSN empieza por 666. Algunos errores son posibles y se aceptan: un número de nueve dígitos que parece un teléfono (`600123456` en una suma) se sustituye y, con varios países activados, un valor puede recibir la etiqueta de otro país (un teléfono español escrito `612 345 678` que pasa la verificación del SIN canadiense se convierte en `[CA_SIN_1]`). Aun así, se sustituye.

Activa solo los países que necesites: cada uno añade patrones que un número cualquiera podría, rara vez, cumplir.

### Dejados fuera a propósito {#left-out-on-purpose}

Sin un dígito de control, estos detectarían demasiados números corrientes, así que no se buscan en ningún país: un SSN o SIN de 9 dígitos sin separadores, números de pasaporte, permisos de conducir, números de Medicare de EE. UU., números de teléfono de longitud variable (entre ellos los alemanes), códigos postales canadienses (parte de una dirección) y los documentos nacionales de Argentina (DNI) y Colombia (cédula).

## Lo que no detecta {#what-it-doesnt-catch}

Los patrones españoles se midieron (ADR-005) sobre 48 textos españoles inventados: se encontraron todos los correos, teléfonos, DNI, NIE e IBAN, con un falso positivo. Los patrones de los demás países se prueban con textos inventados en inglés, alemán, español y portugués, con valores parecidos que no deben sustituirse, y con cientos de valores generados cada uno (ADR-008). Pero hay cosas que ningún patrón detecta:

- **Direcciones postales** ("Calle del Olmo Seco 14, 3.º B").
- **Fechas de nacimiento** (y cualquier otra fecha: un patrón genérico de fechas ocultaría también los plazos de entrega).
- **Nombres de personas que no están en el directorio**: un compañero mencionado de pasada que no está en el curso, un familiar.
- **Un nombre de pila que comparten dos personas** del servicio, como se ha visto arriba.
- **Documentos y teléfonos de países que no hayas activado**, los valores [dejados fuera a propósito](#left-out-on-purpose) y cualquier otra cosa que no esté en las tablas.
- **Lo que la gente escribe sobre sí misma** que la identifica sin nada de lo anterior ("soy la única de la clase que toca el violonchelo").

Así que la redacción es una red de seguridad, no una garantía. Prefiere la estructura: si tu fuente de datos te da el autor de un mensaje como campo, pasa ese campo por `remember()` en lugar de confiar en que `redact()` encuentre el nombre en el texto. Y di en tu README lo que no se detecta.

## Por qué no una librería de detección {#why-not-a-detection-library}

Una prueba de concepto midió OpenRedaction (más de 570 patrones) frente a estos cinco patrones sobre los mismos textos: su configuración por defecto tomaba cualquier par de palabras en mayúscula por un nombre ("Hola profe": 50 falsos positivos), no detectaba los teléfonos fijos españoles y sus "direcciones" eran solo códigos ZIP de EE. UU. Limitada a lo que funcionaba, igualaba a estos patrones sin los teléfonos. La comparación completa está en [ADR-005](https://github.com/falkenslab/pseudonym/blob/main/.minispec/decisions/ADR-005-free-text-redaction.md).
