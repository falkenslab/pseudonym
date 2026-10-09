import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import ThemedImage from "@theme/ThemedImage";
import styles from "./index.module.css";

const FEATURES: { title: string; text: string }[] = [
  {
    title: "Stable aliases",
    text: "A-7K3F9Q instead of a name, an email or an id: the same person always gets the same alias, computed with a key that never leaves the machine.",
  },
  {
    title: "Resolvable by the right person",
    text: "An encrypted local directory remembers who each alias is. The person running your program asks pseudonym whois in their own terminal, offline.",
  },
  {
    title: "One alias per service",
    text: "The same student is one alias in the LMS and another in the mail, so a model can't join what it learns about them. Linking services is opt-in.",
  },
  {
    title: "Free text too",
    text: "redact() replaces the directory's people in a submission or a post with their aliases, and emails, cards, IBANs and national ids of nine countries with placeholders.",
  },
  {
    title: "Inside your program",
    text: "A library, not a server: no MCP tool an agent could call to undo it, no runtime dependencies, nothing sent anywhere.",
  },
  {
    title: "Honest about its limits",
    text: "Pseudonymization, not anonymization. The documentation says what it doesn't catch and how to keep an agent away from the key.",
  },
];

const QUICK = `import { remember, resolve, redact } from "@falkenslab/pseudonym";

const service = "moodle@campus.example.org";

// Before a result reaches the model: people become aliases.
const alias = await remember({
  service,
  identifiers: { email: user.email, serviceUserId: String(user.id) },
  displayName: user.fullname,
});                                      // "A-7K3F9Q"

// A write tool gets an alias back from the model.
const userId = await resolve("A-7K3F9Q", { service });

// Text people wrote.
const { text } = await redact(post.message, { service });`;

export default function Home(): ReactNode {
  return (
    <Layout title="A pseudonymization library for AI tools" description="pseudonym: a pseudonymization library for AI tools. People go to the model as stable aliases, resolvable only on your machine.">
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>
            <ThemedImage
              className={styles.logo}
              alt=""
              sources={{ light: useBaseUrl("/img/logo.svg"), dark: useBaseUrl("/img/logo-dark.svg") }}
            />
            pseudonym
          </h1>
          <p className={styles.tagline}>A pseudonymization library for AI tools.</p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/guides/installation">
              Get started
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/security/threat-model">
              What it protects against
            </Link>
          </div>
          <code className={styles.install}>npm install @falkenslab/pseudonym</code>
        </div>
      </header>
      <main className="container margin-vert--xl">
        <div className="row">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="col col--4 margin-bottom--lg">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
        <div className="row margin-top--lg">
          <div className="col col--7">
            <h2>Three calls</h2>
            <CodeBlock language="ts">{QUICK}</CodeBlock>
          </div>
          <div className="col col--5">
            <h2>See it working</h2>
            <p>
              The <Link to="/docs/example/classroom-mcp">classroom MCP example</Link> is a small MCP server over a made-up course: the
              model lists students, reads the forum and grades someone, and only ever sees aliases.
            </p>
            <p>
              The person in charge keeps the key and the directory, and answers <code>pseudonym whois A-7K3F9Q</code> in their terminal.
              See <Link to="/docs/cli/overview">the CLI</Link>.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
