# Instalación {#installation}

## Requisitos {#requirements}

- Node.js 20 o posterior.
- Un proyecto de [módulos ES](https://nodejs.org/api/esm.html) (`"type": "module"`, o ficheros `.mjs` / `.mts`): el paquete es solo ESM.

No tiene dependencias en tiempo de ejecución e incluye sus tipos de TypeScript.

## En tu programa {#in-your-program}

```bash
npm install @falkenslab/pseudonym
```

```ts
import { remember, resolve, redact, keyFingerprint, PseudonymError } from "@falkenslab/pseudonym";
```

Todo lo público se exporta desde la raíz del paquete; no hay importaciones profundas. La [referencia de la API](/docs/api) lo recoge todo.

## Para quienes ejecutan tu programa {#for-the-people-who-run-your-program}

Necesitan el comando `pseudonym` para averiguar quién es un alias y para hacer copia de seguridad de la clave:

```bash
npm install --global @falkenslab/pseudonym
pseudonym help
```

O, sin instalarlo, `npx @falkenslab/pseudonym <command>`. Si tu programa depende de la librería, `npx pseudonym <command>` dentro de tu proyecto también funciona. Consulta [la CLI](../cli/overview.md).

## Nada que configurar {#nothing-to-configure}

La primera vez que un programa llama a la librería, esta crea la clave y la carpeta que la contiene:

- `%APPDATA%\pseudonym\` en Windows;
- `~/.config/pseudonym/` en macOS y Linux;
- o la carpeta indicada en la variable de entorno `PSEUDONYM_HOME`, si está definida (los tests siempre la definen: consulta [Probar tu integración](testing.md)).

El único otro ajuste es `PSEUDONYM_LINK=true`, que activa el [enlace entre servicios](concepts.md#per-service-aliases-and-linking) en todas las llamadas que no indiquen lo contrario.

## Siguientes pasos {#next}

- [Conceptos](concepts.md): servicios, identificadores, alias y el directorio.
- [Integración](integrating.md): dónde van las llamadas en tu programa.
