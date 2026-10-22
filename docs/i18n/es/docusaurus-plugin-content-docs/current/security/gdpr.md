# El RGPD y el marco legal {#gdpr-and-the-legal-frame}

:::warning No es asesoramiento jurídico

Esta página explica cómo encaja la librería en la normativa de protección de datos según la entienden sus autores, para ayudarte a hablar con tu delegado de protección de datos. Quien decide es el [delegado de protección de datos](https://gdpr-info.eu/art-37-gdpr/) de la institución.

:::

## Qué es el RGPD {#what-the-gdpr-is}

El **Reglamento General de Protección de Datos** ([Reglamento (UE) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj), GDPR en inglés) es la ley de protección de datos de la Unión Europea. No es la ley de un solo país:

- se aplica directamente en todos los Estados miembros de la UE y en el resto del Espacio Económico Europeo (Islandia, Liechtenstein, Noruega);
- también se aplica a organizaciones de fuera de la UE que tratan datos de personas que están en la UE cuando les ofrecen servicios o controlan su comportamiento ([art. 3](https://gdpr-info.eu/art-3-gdpr/));
- cada país añade su propia ley encima: en España, la [Ley Orgánica 3/2018 (LOPDGDD)](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673), bajo la supervisión de la [Agencia Española de Protección de Datos](https://www.aepd.es/).

Un centro educativo, una universidad o una empresa de la UE cuyo personal usa herramientas de IA con datos de estudiantes o empleados está tratando datos personales sujetos al RGPD. Fuera de la UE, consulta [otros países](#outside-the-eu) más abajo.

## Es seudonimización {#its-pseudonymization}

El RGPD define la **seudonimización** ([art. 4.5](https://gdpr-info.eu/art-4-gdpr/)) como el tratamiento de datos personales de manera que ya no puedan atribuirse a una persona sin utilizar información adicional, que figura por separado y está protegida. Eso es lo que hace la librería: la información adicional es la clave y el directorio, guardados en la máquina de la persona responsable.

**No es anonimización**. El [considerando 26](https://gdpr-info.eu/recitals/no-26/) dice que los datos seudonimizados, que podrían atribuirse a una persona con información adicional, siguen siendo información sobre una persona identificable: datos personales, para quien tiene la clave (la institución, a través de la persona responsable). Todo el RGPD les sigue siendo aplicable. Preséntalo como seudonimización, nunca como anonimización.

El Comité Europeo de Protección de Datos explica cómo es una buena seudonimización en sus [Directrices 01/2025 sobre seudonimización](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-012025-pseudonymisation_en).

## En qué ayuda {#what-it-helps-with}

- **Minimización de datos** ([art. 5.1.c](https://gdpr-info.eu/art-5-gdpr/)): el modelo recibe lo que necesita para hacer su trabajo (quién es quién, como alias; qué hizo cada uno) y no nombres, correos, identificadores, teléfonos ni cuentas bancarias que no necesita. La minimización importa por sí misma, haga lo que haga el destinatario con los datos.
- **Protección de datos desde el diseño** ([art. 25](https://gdpr-info.eu/art-25-gdpr/)) y **seguridad del tratamiento** ([art. 32](https://gdpr-info.eu/art-32-gdpr/)): ambos citan la seudonimización como medida. El [considerando 28](https://gdpr-info.eu/recitals/no-28/) añade que reduce los riesgos para los interesados.
- **La posición del destinatario**: en [SEPD contra JUR (asunto C-413/23 P, 4 de septiembre de 2025)](https://curia.europa.eu/juris/liste.jsf?num=C-413/23), el Tribunal de Justicia de la UE declaró que los datos seudonimizados pueden no ser datos personales para un destinatario que no puede reidentificar a nadie por medios razonables, mientras que siguen siéndolo para quien tiene la clave. El asunto se resolvió con el reglamento aplicable a las instituciones de la UE, cuya definición de datos personales es la misma que la del RGPD. Es un argumento a favor de los alias, igual de válido para cualquier seudonimización, no una garantía.
- **Limitación de la finalidad** ([art. 5.1.b](https://gdpr-info.eu/art-5-gdpr/)): por defecto los alias son por servicio, así que los datos de servicios distintos (notas, correo, horario) no se unen bajo un mismo alias salvo que alguien lo decida. Unirlos es lo que más facilita la reidentificación; activa el [enlace entre servicios](../guides/concepts.md#per-service-aliases-and-linking) solo si tienes un motivo.
- **Derecho de supresión y limitación del plazo de conservación** ([art. 17](https://gdpr-info.eu/art-17-gdpr/), [art. 5.1.e](https://gdpr-info.eu/art-5-gdpr/)): `pseudonym forget` elimina a una persona, `pseudonym forget --service` un servicio entero (un curso cerrado), `pseudonym forget --all` a todo el mundo, y `pseudonym prune` a quien no se haya visto desde hace un tiempo (consulta [Ordenar el directorio](../cli/tidying-the-directory.md)). La clave se mantiene, así que alguien con quien te vuelvas a encontrar recupera el mismo alias. Son una pieza de una solicitud de supresión: lo que ya tengan tu programa o el proveedor del modelo va aparte.

## Lo que la institución sigue necesitando {#what-the-institution-still-needs}

La librería es una medida técnica. Las medidas legales corresponden a la institución:

- una **base jurídica** para tratar datos de estudiantes o del personal con una herramienta de IA ([art. 6](https://gdpr-info.eu/art-6-gdpr/));
- un **contrato de encargo del tratamiento** con el proveedor del modelo, que actúa como encargado del tratamiento ([art. 28](https://gdpr-info.eu/art-28-gdpr/));
- un mecanismo válido para las **transferencias internacionales** si el proveedor trata los datos fuera del EEE, o un proveedor alojado en la UE ([capítulo V](https://gdpr-info.eu/chapter-5/));
- una **evaluación de impacto relativa a la protección de datos (EIPD)** ([art. 35](https://gdpr-info.eu/art-35-gdpr/)) que enumere lo que cada herramienta envía al modelo e indique lo que no se detecta en el texto libre;
- **información a los interesados** sobre el tratamiento ([art. 13](https://gdpr-info.eu/art-13-gdpr/)).

## Fuera de la UE {#outside-the-eu}

Otros países tienen sus propias leyes, con ideas parecidas y detalles distintos. Algunos puntos de partida:

- **Reino Unido**: el UK GDPR, mantenido tras el Brexit y cercano al de la UE: [guía de la ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/).
- **Canadá**: [PIPEDA](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/) para organizaciones privadas, y leyes provinciales para organismos públicos como los centros educativos.
- **Estados Unidos**: no hay una ley federal general; se aplican leyes sectoriales, como FERPA para los expedientes académicos de los estudiantes, además de leyes estatales.

La seudonimización y la minimización son buenas prácticas en todas ellas; lo que exige cada una es cosa de tus asesores legales.

## Qué contar a tus usuarios {#what-to-tell-your-users}

Si construyes un programa sobre la librería, tu README debería indicar:

- qué campos envía cada herramienta al modelo, y que las personas van como alias;
- que es seudonimización, no anonimización;
- lo que la redacción no detecta (direcciones, fechas de nacimiento, personas que no están en el directorio);
- cómo mantener a su agente lejos de la clave y de la CLI ([Mantener a los agentes lejos de la clave](keeping-agents-away.md)).

La persona que usa tu programa ve sus propios datos sin alias si tu programa se los muestra: es decisión tuya, y no cambia lo que recibe el modelo.
