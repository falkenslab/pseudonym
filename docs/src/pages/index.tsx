import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import ThemedImage from "@theme/ThemedImage";
import styles from "./index.module.css";

// Every text goes through translate(): Spanish lives in i18n/es/code.json (`npm run write-translations -- --locale es` in docs/ adds new ids).
const FEATURES: { title: string; text: string }[] = [
  {
    title: translate({ id: "home.features.stable.title", message: "Stable aliases" }),
    text: translate({
      id: "home.features.stable.text",
      message: "A-7K3F9Q instead of a name, an email or an id: the same person always gets the same alias, computed with a key that never leaves the machine.",
    }),
  },
  {
    title: translate({ id: "home.features.resolvable.title", message: "Resolvable by the right person" }),
    text: translate({
      id: "home.features.resolvable.text",
      message: "An encrypted local directory remembers who each alias is. The person running your program asks pseudonym whois in their own terminal, offline.",
    }),
  },
  {
    title: translate({ id: "home.features.perService.title", message: "One alias per service" }),
    text: translate({
      id: "home.features.perService.text",
      message: "The same student is one alias in the LMS and another in the mail, so a model can't join what it learns about them. Linking services is opt-in.",
    }),
  },
  {
    title: translate({ id: "home.features.freeText.title", message: "Free text too" }),
    text: translate({
      id: "home.features.freeText.text",
      message: "redact() replaces the directory's people in a submission or a post with their aliases, and emails, cards, IBANs and national ids of nine countries with placeholders.",
    }),
  },
  {
    title: translate({ id: "home.features.inside.title", message: "Inside your program" }),
    text: translate({
      id: "home.features.inside.text",
      message: "A library, not a server: no MCP tool an agent could call to undo it, no runtime dependencies, nothing sent anywhere.",
    }),
  },
  {
    title: translate({ id: "home.features.honest.title", message: "Honest about its limits" }),
    text: translate({
      id: "home.features.honest.text",
      message: "Pseudonymization, not anonymization. The documentation says what it doesn't catch and how to keep an agent away from the key.",
    }),
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
  const tagline = translate({ id: "home.tagline", message: "A pseudonymization library for AI tools." });
  return (
    <Layout
      title={translate({ id: "home.title", message: "A pseudonymization library for AI tools" })}
      description={translate({
        id: "home.description",
        message: "pseudonym: a pseudonymization library for AI tools. People go to the model as stable aliases, resolvable only on your machine.",
      })}
    >
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
          <p className={styles.tagline}>{tagline}</p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/guides/installation">
              <Translate id="home.getStarted">Get started</Translate>
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/security/threat-model">
              <Translate id="home.protects">What it protects against</Translate>
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
            <h2>
              <Translate id="home.threeCalls">Three calls</Translate>
            </h2>
            <CodeBlock language="ts">{QUICK}</CodeBlock>
          </div>
          <div className="col col--5">
            <h2>
              <Translate id="home.seeIt">See it working</Translate>
            </h2>
            <p>
              <Translate
                id="home.example"
                values={{
                  example: (
                    <Link to="/docs/example/classroom-mcp">
                      <Translate id="home.example.link">classroom MCP example</Translate>
                    </Link>
                  ),
                }}
              >
                {"The {example} is a small MCP server over a made-up course: the model lists students, reads the forum and grades someone, and only ever sees aliases."}
              </Translate>
            </p>
            <p>
              <Translate
                id="home.cli"
                values={{
                  whois: <code>pseudonym whois A-7K3F9Q</code>,
                  cli: (
                    <Link to="/docs/cli/overview">
                      <Translate id="home.cli.link">the CLI</Translate>
                    </Link>
                  ),
                }}
              >
                {"The person in charge keeps the key and the directory, and answers {whois} in their terminal. See {cli}."}
              </Translate>
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
