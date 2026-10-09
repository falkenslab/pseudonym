// A made-up course, as an LMS would return it: who the students are, their grades and what they wrote in
// the forum. Every name, email, id, phone, DNI and IBAN here is invented. In a real server this comes from
// the LMS's API; the point is that none of it reaches the model as it is.

export const SERVICE = "classroom@example-school.test";

export const ACTIVITIES = ["practice1", "practice2", "exam"] as const;
export type Activity = (typeof ACTIVITIES)[number];

export interface Student {
  /** The LMS's own user id: what a write must use, and what resolve() gives back. */
  lmsId: string;
  /** The school's student number, the same in every service. */
  studentNumber: string;
  email: string;
  fullName: string;
  grades: Partial<Record<Activity, number>>;
}

export interface Post {
  authorLmsId: string;
  date: string;
  text: string;
}

export function createCourse(): { students: Student[]; posts: Post[] } {
  const students: Student[] = [
    { lmsId: "u-4821", studentNumber: "2024-0031", email: "marta.quiroga@students.example-school.test", fullName: "Marta Quiroga", grades: { practice1: 8.5, practice2: 7 } },
    { lmsId: "u-4822", studentNumber: "2024-0047", email: "hugo.estrella@students.example-school.test", fullName: "Hugo Estrella", grades: { practice1: 6, practice2: 5.5 } },
    { lmsId: "u-4823", studentNumber: "2024-0052", email: "irene.valbuena@students.example-school.test", fullName: "Irene Valbuena", grades: { practice1: 9.5 } },
    { lmsId: "u-4824", studentNumber: "2024-0068", email: "pablo.lorente@students.example-school.test", fullName: "Pablo Lorente", grades: { practice1: 4, practice2: 6.5 } },
    { lmsId: "u-4825", studentNumber: "2024-0071", email: "lucia.ferrandiz@students.example-school.test", fullName: "Lucía Ferrándiz", grades: { practice1: 7.5, practice2: 8 } },
    { lmsId: "u-4826", studentNumber: "2024-0090", email: "lucia.montero@students.example-school.test", fullName: "Lucía Montero", grades: { practice1: 5, practice2: 9 } },
  ];
  const posts: Post[] = [
    { authorLmsId: "u-4821", date: "2026-10-01", text: "Hola, soy Marta Quiroga. ¿Alguien hace la práctica 2 conmigo? Mi móvil es 612 345 678 y mi correo marta.q.personal@mail.example.test." },
    { authorLmsId: "u-4822", date: "2026-10-01", text: "Yo me apunto, Marta. Hugo Estrella, del grupo B." },
    { authorLmsId: "u-4824", date: "2026-10-02", text: "Profe, para la beca me piden el DNI 48392017V y la cuenta ES91 2100 0418 4502 0005 1332, ¿se los paso a secretaría?" },
    { authorLmsId: "u-4823", date: "2026-10-03", text: "Irene aquí: he subido los apuntes del tema 3. Pablo, te los dejo también en tu correo pablo.lorente@students.example-school.test." },
    // Two students are called Lucía: "Lucía" alone could be either, so redact() leaves it as it is.
    { authorLmsId: "u-4825", date: "2026-10-04", text: "Lucía, ¿me pasas tu parte? Firmado: LUCÍA FERRÁNDIZ." },
  ];
  return { students, posts };
}
