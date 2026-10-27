# Almacenamiento: cifrado o plano {#storage-encrypted-or-plain}

El directorio, el fichero que recuerda quién es cada alias, se puede guardar de dos maneras. **Cifrado** es la opción por defecto y lo que da por hecho todo lo demás en esta documentación. **Plano** lo guarda como JSON legible y sin clave alguna, para entornos en los que el sistema operativo ya protege la carpeta.

| Qué | Cifrado (por defecto) | Plano |
| --- | --- | --- |
| Fichero | `directory.enc` | `directory.json` |
| En disco | AES-256-GCM, ilegible sin la clave | JSON legible: **nombres, correos e ids en claro** |
| Clave | `key` y `used`, creados en el primer uso | Ninguna |
| Alias | HMAC del identificador con la clave: la misma persona recibe siempre el mismo alias, incluso después de olvidarla | Aleatorios, guardados en el directorio: estables mientras la persona esté en él; si se olvida y se vuelve a encontrar, un alias nuevo |
| Reconocer a las personas | Hashes con clave (matchers) de correos e identificadores institucionales | Los propios identificadores |
| Protegido por | La clave y los permisos de la carpeta | Solo los permisos de la carpeta |

Lo que llega al modelo es lo mismo en ambos: alias y marcadores. La diferencia está en lo que puede averiguar quien sea capaz de leer la carpeta.

## Cuándo elegir plano {#when-to-choose-plain}

Solo cuando la carpeta ya está protegida por otra cosa y prefieres datos legibles a una clave que tienes que guardar:

- el programa se ejecuta con su propia cuenta de usuario, o en un contenedor, y nada más puede leer sus ficheros;
- necesitas revisar o corregir el directorio a mano, o hacer su copia de seguridad junto con el resto de tus datos;
- no quieres gestionar una clave en esa máquina.

Si un agente, otro usuario o una carpeta sincronizada pueden leerla, quédate con la opción por defecto.

## Elegir el modo {#choosing-the-mode}

En código, antes de la primera llamada:

```ts
import { configure } from "@falkenslab/pseudonym";

configure({ storage: "plain" });
```

O con una variable de entorno, que también lee la [CLI](../cli/overview.md):

```bash
export PSEUDONYM_STORAGE=plain        # sh
```

```powershell
$env:PSEUDONYM_STORAGE = "plain"      # PowerShell
```

`configure()` tiene prioridad sobre la variable; sin ninguna de las dos, el almacenamiento es `encrypted`. `storageMode()` indica cuál está en uso. Todos los programas que comparten la carpeta, y la CLI, deben usar el mismo modo.

## Nunca cambia por sí solo {#it-never-switches-by-itself}

Si la carpeta contiene el directorio del otro modo, todas las llamadas fallan con un `PseudonymError` que dice qué hacer, y no se cambia nada: un `directory.json` plano nunca se lee como cifrado, un `directory.enc` cifrado nunca se sustituye por uno plano, y una clave ausente o incorrecta nunca hace que la librería recurra al almacenamiento plano. Una carpeta con los dos ficheros también es un error.

## El formato JSON {#the-json-format}

```json
{
  "format": "pseudonym-directory",
  "version": 1,
  "entries": [
    {
      "alias": "A-9NQWD5",
      "displayName": "Marta Quiroga",
      "services": [{ "service": "moodle@campus.example.org", "id": "4821" }],
      "matchers": ["institutionalId:20240031", "email:marta.q@school.example.org"],
      "links": [],
      "firstSeen": "2026-10-27T09:12:44.106Z",
      "lastSeen": "2026-10-27T10:03:17.520Z"
    }
  ]
}
```

- `services`: dónde se conoció a la persona, con el `serviceUserId` que devuelve [`resolve()`](integrating.md#3-take-aliases-back-with-resolve).
- `matchers`: los identificadores [normalizados](concepts.md#identifiers) que reconocen a la persona, como `kind:value`.
- `links`: alias [enlazados](../cli/tidying-the-directory.md#link-two-aliases) con este.
- `version` solo cambia si cambia el formato; una versión más reciente de la que conoce la librería se rechaza, no se adivina.

El fichero se escribe entero mediante un fichero temporal y un renombrado, con el mismo bloqueo que el cifrado, y solo su usuario puede leerlo (`0600` en macOS y Linux; en Windows, `%APPDATA%` ya es por usuario). Edítalo a mano solo mientras ningún programa esté usando la carpeta.

## Convertir un directorio {#converting-a-directory}

`pseudonym migrate` convierte el directorio de la carpeta al otro modo, con los mismos alias:

```bash
pseudonym migrate --to plain        # directory.enc → directory.json
pseudonym migrate --to encrypted    # directory.json → directory.enc (with PSEUDONYM_STORAGE=plain set)
```

- Te pide que escribas el modo para confirmar (`--yes` en un script), escribe el fichero nuevo y aparta el original como `<file>.<date>.bak`: no se borra nada.
- Se niega si no hay nada que convertir, o si el fichero de destino ya existe.
- Después, establece `PSEUDONYM_STORAGE` al nuevo modo para todos los programas y la CLI.
- **Al pasar a plano**, los correos y los identificadores institucionales no se pueden llevar: el directorio cifrado solo tiene sus hashes con clave, que no se pueden revertir. Las personas se siguen reconociendo por sus identificadores de servicio; el comando indica cuántas no tienen ninguno y recibirán un alias nuevo si se las vuelve a encontrar.
- Al pasar a cifrado, se lleva todo: los identificadores en claro se convierten en hashes con clave bajo la clave (que se crea si no había ninguna).

## Qué supone para la privacidad {#what-it-means-for-privacy}

El almacenamiento plano es la decisión de guardar datos personales sin cifrar. Según el [RGPD](../security/gdpr.md), el directorio sigue siendo la «información adicional» de la seudonimización y debe estar «conservada por separado y protegida»: en modo plano, esa protección son los permisos y el aislamiento de la carpeta, y garantizarlos te corresponde a ti. [Mantén a los agentes alejados](../security/keeping-agents-away.md) de la carpeta igual que de la clave: con almacenamiento plano, leer `directory.json` basta para deshacer todos los alias.
