# Probar tu integración {#testing-your-integration}

## No toques nunca la clave real {#never-touch-the-real-key}

Apunta `PSEUDONYM_HOME` a una carpeta temporal nueva antes de que tus tests llamen a la librería. Cada carpeta tiene su propia clave y su propio directorio. Con [`node:test`](https://nodejs.org/api/test.html) (cualquier ejecutor de tests funciona igual):

```ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach } from "node:test";

beforeEach(() => {
  process.env.PSEUDONYM_HOME = mkdtempSync(path.join(tmpdir(), "pseudonym-"));
});
```

La librería lee `PSEUDONYM_HOME` en cada llamada, así que basta con definirla en `beforeEach`. Los procesos hijos que lances también la necesitan en su entorno.

## No compruebes alias fijos {#dont-assert-on-fixed-aliases}

Cada carpeta temporal tiene una clave aleatoria nueva, así que los alias cambian de una ejecución a otra. Comprueba su forma, o compara dos llamadas:

```ts
const ALIAS = /^A-[0-9A-HJKMNP-TV-Z]{6,12}$/;

const [a] = await remember([person]);
assert.match(a, ALIAS);
assert.equal(await remember(person), a); // stable within the same folder
```

## Comprueba que no se filtra nada personal {#assert-that-nothing-personal-leaks}

La prueba más útil de una integración: llama a tus herramientas y comprueba que ningún valor personal de tus datos de prueba aparece en su salida.

```ts
const personal = students.flatMap((s) => [s.fullName, s.email, s.studentNumber, String(s.id)]);

const output = await callTool("list_students");
for (const value of personal) assert.ok(!output.includes(value), `leaked: ${value}`);
```

Usa datos inventados en los datos de prueba: nombres inventados y dominios como `example.test` o `example-school.test`.

## Prueba el camino de vuelta {#test-the-way-back}

En las herramientas de escritura, comprueba que un alias obtenido de una herramienta se resuelve en el registro correcto, y que un alias desconocido produce un error legible:

```ts
const [{ student }] = JSON.parse(await callTool("list_students"));
await callTool("grade_student", { student, grade: 6 });
assert.equal(gradebook.get(students[0].id), 6);

const result = await callTool("grade_student", { student: "A-000000", grade: 5 });
assert.equal(result.isError, true);
```

El [test del ejemplo del aula](https://github.com/falkenslab/pseudonym/blob/main/examples/classroom-mcp/test/tools.test.ts) hace todo esto a través de MCP, con un cliente dentro del mismo proceso.
