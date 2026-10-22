# Hacer copia de la clave y trasladarla {#backing-up-and-moving-the-key}

La clave se crea la primera vez que un programa de esta máquina usa la librería. Todo depende de ella: sin ella no se puede resolver ningún alias ni leer el directorio. **Haz una copia una vez, el primer día.**

## La huella {#the-fingerprint}

```text
$ pseudonym key fingerprint
CJ76RG29
```

Un código corto que identifica la clave sin revelar nada de ella. Dos máquinas con la misma huella dan a las mismas personas los mismos alias. Úsala para comprobar una copia o un traslado.

Si todavía no hay clave, lo dice y termina con el código `2`; nunca crea una.

## Haz una copia {#back-it-up}

```bash
pseudonym key export > pseudonym-key.txt
```

La clave va a stdout en base64, y un aviso a stderr. **Quien tenga la clave puede resolver todos los alias**: guarda el fichero en un lugar seguro (un gestor de contraseñas es buen sitio), y nunca donde un agente pueda leerlo. Después borra la copia de la carpeta actual.

`key export` es el único comando que imprime la clave, y solo cuando tú lo ejecutas.

## Restáurala o trasládala a otra máquina {#restore-it-or-move-it-to-another-machine}

La clave se lee de **stdin**, nunca de la línea de comandos, donde quedaría en el historial de la shell y sería visible en la lista de procesos:

```bash
pseudonym key import < pseudonym-key.txt
```

O ejecútalo sin más y pega la clave cuando te la pida: no se muestra nada en pantalla mientras escribes o pegas, y Ctrl+C cancela.

```text
$ pseudonym key import
Paste the key (from "pseudonym key export"):
Key imported (fingerprint CJ76RG29).
```

- En una máquina sin clave, se instala.
- Si la clave se perdió después de haberse usado aquí (la librería se niega entonces a funcionar y remite a este comando), importar la misma clave lo recupera todo: el directorio vuelve a abrirse y los alias son los mismos.
- Si ya está la misma clave, lo dice y no cambia nada.

Para usar los mismos alias en dos máquinas, importa la misma clave en ambas. Cada máquina mantiene su propio directorio: una persona vista solo en una máquina solo se puede resolver allí, hasta que se la vea también en la otra.

## Sustituye una clave distinta {#replace-a-different-key}

`key import` se niega a sustituir una clave distinta de la que le das: todos los alias y el directorio dependen de la actual.

```text
$ pseudonym key import < other-key.txt
pseudonym: A different key is already in use (fingerprint CJ76RG29). Every alias and the directory depend on it. To replace it anyway, run "pseudonym key import --force": the current directory will be kept as a backup that only the old key opens.
```

Con `--force`, primero mueve el directorio actual a `directory.enc.<date>.bak` en la misma carpeta (dice dónde) y después instala la clave nueva. No se borra nada: importar de nuevo la clave antigua y renombrar la copia otra vez a `directory.enc` restaura el estado anterior.

## Si la clave se pierde para siempre {#if-the-key-is-lost-for-good}

No hay recuperación, por diseño: los alias no se pueden resolver y el directorio no se puede leer. Los programas se niegan a funcionar en lugar de crear en silencio una clave nueva que daría a todos alias nuevos. Para empezar de cero, borra la carpeta entera (`key`, `used` y `directory.enc`); el siguiente programa que se ejecute crea una clave nueva, y todos reciben alias nuevos.
