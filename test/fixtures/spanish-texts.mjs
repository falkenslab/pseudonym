// Made-up Spanish forum posts and submissions, from the OpenRedaction spike (ADR-005). Values are
// generated with valid check digits (DNI/NIE letter, IBAN mod 97) from a fixed seed, emails use invented
// domains (OpenRedaction ignores reserved example ones), and names are invented: none is meant to be a
// real person's. buildDataset() gives 48 texts, each with its expected entities by kind.

let seed = 20261009;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const digits = (n) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");
const LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

export function dni() {
  const n = digits(8);
  return `${n}${LETTERS[Number(n) % 23]}`;
}
export function nie() {
  const prefix = "XYZ"[Math.floor(rand() * 3)];
  const n = digits(7);
  return `${prefix}${n}${LETTERS[Number(`${"XYZ".indexOf(prefix)}${n}`) % 23]}`;
}
export function iban(spaced) {
  const bban = digits(20);
  // ES = 1428; check digits so that the rearranged number mod 97 is 1.
  const rest = BigInt(`${bban}142800`) % 97n;
  const check = String(98n - rest).padStart(2, "0");
  const raw = `ES${check}${bban}`;
  return spaced ? raw.replace(/(.{4})/g, "$1 ").trim() : raw;
}
const mobile = () => `6${digits(2)} ${digits(3)} ${digits(3)}`;
const landline = () => `+34 91 ${digits(3)} ${digits(2)} ${digits(2)}`;
const mobileIntl = () => `+34 7${digits(8)}`;

const NAMES = ["Lucía Ferrándiz", "Marcos Olabarría", "Irene Quintanilla", "Hugo Estrella", "Nerea Valbuena", "Íker Montalbán"];
const STREETS = ["Calle del Olmo Seco 14, 3.º B, 28045 Madrid", "Avenida de la Ribera 7, bajo, 46011 Valencia", "C/ Pintor Albéniz 22, 1.º 2.ª, 41005 Sevilla", "Plaza de los Tilos 3, 38004 Santa Cruz de Tenerife"];
const pick = (list) => list[Math.floor(rand() * list.length)];

/** Each text with the personal data in it, by kind. */
export function buildDataset() {
  const texts = [];
  const add = (text, entities) => texts.push({ id: texts.length + 1, text, entities });
  for (let i = 0; i < 6; i++) {
    const d = dni();
    add(`Hola profe, no puedo entrar al aula virtual. Mi DNI es ${d}, por si lo necesitas para revisarlo.`, [{ kind: "dni", value: d }]);
  }
  for (let i = 0; i < 3; i++) {
    const n = nie();
    add(`Buenas, me matriculé con el NIE ${n} y en secretaría no me encuentran.`, [{ kind: "nie", value: n }]);
  }
  for (let i = 0; i < 4; i++) {
    const p = i % 2 ? landline() : mobile();
    add(`Si hace falta podéis llamarme al ${p} por las tardes.`, [{ kind: "phone", value: p }]);
  }
  for (let i = 0; i < 2; i++) {
    const p = mobileIntl();
    add(`Mi WhatsApp es ${p}, escribidme para el trabajo en grupo.`, [{ kind: "phone", value: p }]);
  }
  for (let i = 0; i < 4; i++) {
    const e = `${pick(["lucia.f", "marcos_ola", "irene.q99", "hugo.estrella"])}@${pick(["alumnado.centro-ficticio.es", "correo.ficticio.es"])}`;
    add(`Os dejo mi correo ${e} para que me paséis los apuntes.`, [{ kind: "email", value: e }]);
  }
  for (let i = 0; i < 4; i++) {
    const b = iban(i % 2 === 0);
    add(`Para el pago de la excursión, mi cuenta es ${b} (a nombre de mi madre).`, [{ kind: "iban", value: b }]);
  }
  for (let i = 0; i < 4; i++) {
    const a = STREETS[i];
    add(`Vivo en ${a}, así que puedo acercar los materiales al centro.`, [{ kind: "address", value: a }]);
  }
  for (const [text, value] of [
    ["Nací el 12/03/2006, así que soy menor y necesito autorización.", "12/03/2006"],
    ["Fecha de nacimiento: 3 de mayo de 2005.", "3 de mayo de 2005"],
  ]) add(text, [{ kind: "birthdate", value }]);
  for (let i = 0; i < 4; i++) {
    const n = NAMES[i];
    add(`Me llamo ${n} y soy nueva en el grupo B, encantada.`, [{ kind: "name", value: n }]);
  }
  // Several kinds together, as in a real introduction post.
  {
    const d = dni(), e = "nerea.vb@alumnado.centro-ficticio.es", p = mobile();
    add(`Presentación: soy Nerea Valbuena, DNI ${d}. Correo ${e}, móvil ${p}. Me interesa la parte de bases de datos.`, [
      { kind: "name", value: "Nerea Valbuena" }, { kind: "dni", value: d }, { kind: "email", value: e }, { kind: "phone", value: p },
    ]);
  }
  // Texts without personal data: code, maths, numbers that look like other things.
  for (const text of [
    "def es_valido(dni):\n    letras = 'TRWAGMYFPDXBNJZSQVHLCKE'\n    return dni[-1] == letras[int(dni[:-1]) % 23]",
    "email = input('Introduce tu email: ')\nif '@' not in email:\n    print('Email no válido')",
    "SELECT nombre, email, telefono FROM alumnos WHERE curso_id = 20251 ORDER BY 2;",
    "La complejidad es O(n log n): para n = 1048576 hacen falta unos 20971520 pasos.",
    "El commit 3f9a2c41e8b7 corrige el bug; la versión 2.14.3 sale el 15/11/2026.",
    "En 1492 llegaron a América y en 1812 se aprobó la Constitución de Cádiz.",
    "Resultado del ejercicio 4: x = 600123456 / 2 = 300061728.",
    "La IP del servidor de pruebas es 192.168.1.50 y el puerto 8080.",
    "for i in range(10000000):\n    total += i * 3.14159",
    "El ISBN del libro es 978-84-376-0494-7 y lo tenéis en la biblioteca.",
    "Entrega la práctica antes del 20/12/2026 a las 23:55 en formato .zip.",
    "Tabla: id=12345678, nota=8.5, intentos=3; id=87654321, nota=6.0, intentos=1.",
    "La función hash devuelve 5d41402abc4b2a76b9719d911017c592 para 'hello'.",
    "Usad la clase Persona(nombre, apellidos, telefono) del tema 5.",
  ]) add(text, []);
  return texts;
}
