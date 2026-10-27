# De qué te protege {#what-it-protects-against}

## La amenaza que aborda {#the-threat-it-addresses}

**Que datos sobre personas lleguen por accidente a un modelo de lenguaje**, a través de los programas que usan la librería. El agente de un docente que lee las entregas, las notas y el foro de un curso enviaría, sin ella, nombres, correos e identificadores de los estudiantes a un modelo que puede ejecutarse fuera de la institución, fuera del país o fuera de la UE.

Con la librería, el modelo ve alias en lugar de personas y marcadores en lugar de datos de contacto e identidad en el texto libre, y aun así puede hacer su trabajo: distinguir a las personas, referirse a ellas y pedir a tu programa que actúe sobre ellas.

## En qué se apoya {#what-it-relies-on}

- **Tu programa pasa a cada persona por ella.** La librería sustituye lo que le das; un campo que olvides (la URL de un avatar, un nombre de usuario en un enlace) sale tal cual. Intégrala donde se construyen los resultados y comprueba que no se filtra nada ([Probar tu integración](../guides/testing.md)).
- **La clave se queda en la máquina y lejos del agente.** (En [almacenamiento plano](../guides/storage.md) no hay clave: lo que debe quedar lejos es el propio directorio, en claro, protegido por los permisos de la carpeta.) La clave y el directorio están en la carpeta del usuario, legibles solo por él. El modelo nunca los ve; un agente que se ejecute en la misma máquina podría, salvo que el cliente se lo impida.

## De qué no te protege {#what-it-doesnt-protect-against}

- **Un agente que lea deliberadamente la clave o ejecute la CLI** en la misma máquina. La librería no puede impedirlo desde dentro; los permisos del cliente pueden, en parte, y el sandbox (entorno aislado) del sistema operativo, por completo. Consulta [Mantener a los agentes lejos de la clave](keeping-agents-away.md).
- **Lo que la redacción no detecta** en el texto libre: direcciones postales, fechas de nacimiento, personas que no están en el directorio, un nombre de pila que comparten dos personas y cualquier cosa que alguien cuente de sí mismo y que lo identifique. Consulta [Redactar texto libre](../guides/redaction.md#what-it-doesnt-catch).
- **La reidentificación por el contexto.** Un modelo al que se le dice que `A-7K3F9Q` es "el único estudiante del grupo B que toca el violonchelo" puede deducir quién es. Los alias ocultan identificadores, no hechos.
- **Cualquiera que tenga la clave.** La clave resuelve todos los alias: quien la consiga (una copia de seguridad olvidada en una carpeta compartida, un portátil robado sin cifrado de disco) puede deshacerlo todo.
- **Que el proveedor del modelo conserve lo que recibe.** Recibe alias y texto redactado: de eso se trata. Pero tu contrato con él sigue importando (consulta [El RGPD y el marco legal](gdpr.md)).
- **Las demás salidas de tu propio programa.** Proteger los registros, las cachés y los archivos que escribe tu programa te corresponde a ti.

## Por qué una librería y no un servidor {#why-a-library-and-not-a-server}

Un servidor MCP que ofreciera las herramientas `mask` y `unmask` le daría al agente una forma de deshacer la seudonimización y le dejaría decidir cuándo enmascarar. Una librería dentro del servidor que ya sabe qué campos son personas es exacta y no le da al agente nada a lo que llamar (ADR-001).

Para servidores de terceros que no pueden integrar una librería, la opción es un proxy que seudonimice; se basa en la detección, así que se le escapa lo que sus reglas no conocen.

## Por qué alias y no tokens cifrados {#why-aliases-and-not-encrypted-tokens}

Un token cifrado por persona (un JWE con identificador, nombre y correo) es, legalmente, la misma seudonimización, pero envía datos de contacto que el modelo no necesita, expone todo lo enviado si la clave se filtra, cambia cuando cambia el correo y le cuesta al modelo cientos de caracteres por mención. Un alias tiene ocho caracteres, y la resolución sin conexión que darían los tokens la proporciona el directorio local (ADR-006).
