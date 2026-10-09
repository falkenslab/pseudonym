import { existsSync, readFileSync } from "node:fs";
import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// Released versions, newest first (`npm run docs:version -- <version>` at each release). The
// newest is what /docs shows; the work in progress on main is "Next", under /docs/next.
const versions: string[] = existsSync("./versions.json") ? JSON.parse(readFileSync("./versions.json", "utf8")) : [];

const config: Config = {
  title: "pseudonym",
  tagline: "Stable aliases for people, so programs can tell a language model about them without names.",
  favicon: "img/favicon.svg",

  url: "https://falkenslab.github.io",
  baseUrl: "/pseudonym/",
  organizationName: "falkenslab",
  projectName: "pseudonym",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  markdown: {
    mermaid: true,
    // .md files (the guides and the generated API reference) are CommonMark, not MDX: doc
    // comments hold `<placeholders>` MDX would read as tags.
    format: "detect",
    hooks: { onBrokenMarkdownLinks: "throw" },
  },

  i18n: { defaultLocale: "en", locales: ["en"] },

  presets: [
    [
      "classic",
      {
        docs: {
          path: "content",
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/falkenslab/pseudonym/edit/main/docs/",
          // Before the first versioned release, main is the only version, served at /docs.
          ...(versions.length > 0
            ? {
                lastVersion: versions[0],
                versions: { current: { label: "Next (unreleased)", path: "next", banner: "unreleased" } },
              }
            : { versions: { current: { label: "Next (unreleased)" } } }),
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["../src/index.ts"],
        tsconfig: "../tsconfig.json",
        out: "content/api",
        readme: "none",
        excludePrivate: true,
        excludeInternal: true,
        excludeExternals: true,
        disableSources: false,
        sourceLinkTemplate: "https://github.com/falkenslab/pseudonym/blob/main/{path}#L{line}",
        gitRevision: "main",
        parametersFormat: "table",
        interfacePropertiesFormat: "table",
        typeDeclarationFormat: "table",
        enumMembersFormat: "table",
        indexFormat: "table",
        useCodeBlocks: true,
        expandObjects: false,
        sidebar: { pretty: true },
      },
    ],
  ],

  themes: [
    "@docusaurus/theme-mermaid",
    [
      "@easyops-cn/docusaurus-search-local",
      { hashed: true, docsDir: "content", docsRouteBasePath: "docs", indexBlog: false, highlightSearchTermsOnTargetPage: true },
    ],
  ],

  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "pseudonym",
      logo: { alt: "pseudonym", src: "img/logo.svg" },
      items: [
        { type: "docSidebar", sidebarId: "guides", position: "left", label: "Guides" },
        { type: "docSidebar", sidebarId: "cli", position: "left", label: "CLI" },
        { type: "docSidebar", sidebarId: "security", position: "left", label: "Security and privacy" },
        { type: "docSidebar", sidebarId: "api", position: "left", label: "API reference" },
        { type: "docsVersionDropdown", position: "right" },
        { href: "https://www.npmjs.com/package/@falkenslab/pseudonym", label: "npm", position: "right" },
        { href: "https://github.com/falkenslab/pseudonym", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "Installation", to: "/docs/guides/installation" },
            { label: "The CLI", to: "/docs/cli/overview" },
            { label: "Security and privacy", to: "/docs/security/threat-model" },
            { label: "API reference", to: "/docs/api" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "GitHub", href: "https://github.com/falkenslab/pseudonym" },
            { label: "npm", href: "https://www.npmjs.com/package/@falkenslab/pseudonym" },
            { label: "Design decisions (ADRs)", href: "https://github.com/falkenslab/pseudonym/tree/main/.minispec/decisions" },
          ],
        },
        {
          title: "Related",
          items: [
            { label: "Classroom MCP example", href: "https://github.com/falkenslab/pseudonym/tree/main/examples/classroom-mcp" },
            { label: "Model Context Protocol", href: "https://modelcontextprotocol.io" },
          ],
        },
      ],
      copyright: `MIT licensed. Copyright © ${new Date().getFullYear()} Falkenslab.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "powershell"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
