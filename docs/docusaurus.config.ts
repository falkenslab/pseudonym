import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "pseudonym",
  tagline: "A pseudonymization library for AI tools.",
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

  // English at /pseudonym/, Spanish at /pseudonym/es/ (translations in i18n/es/; ADR-009).
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    localeConfigs: { en: { label: "English", htmlLang: "en" }, es: { label: "Español", htmlLang: "es" } },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          path: "content",
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/falkenslab/pseudonym/edit/main/docs/",
          // One version only: the site always describes main, the latest release.
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
      { hashed: true, language: ["en", "es"], docsDir: "content", docsRouteBasePath: "docs", indexBlog: false, highlightSearchTermsOnTargetPage: true },
    ],
  ],

  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "pseudonym",
      logo: { alt: "pseudonym", src: "img/logo.svg", srcDark: "img/logo-dark.svg" },
      items: [
        { type: "docSidebar", sidebarId: "guides", position: "left", label: "Guides" },
        { type: "docSidebar", sidebarId: "cli", position: "left", label: "CLI" },
        { type: "docSidebar", sidebarId: "security", position: "left", label: "Security and privacy" },
        { type: "docSidebar", sidebarId: "api", position: "left", label: "API reference" },
        { type: "localeDropdown", position: "right" },
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
      copyright: "Made with 💖 by Falken's Lab Team",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "powershell"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
