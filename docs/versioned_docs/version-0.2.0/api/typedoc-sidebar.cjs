// @ts-check
/** @type {import("@docusaurus/plugin-content-docs").SidebarsConfig} */
const typedocSidebar = {
  items: [
    {
      type: "category",
      label: "Classes",
      items: [
        {
          type: "doc",
          id: "api/classes/PseudonymError",
          label: "PseudonymError"
        }
      ]
    },
    {
      type: "category",
      label: "Interfaces",
      items: [
        {
          type: "doc",
          id: "api/interfaces/Identifiers",
          label: "Identifiers"
        },
        {
          type: "doc",
          id: "api/interfaces/Person",
          label: "Person"
        },
        {
          type: "doc",
          id: "api/interfaces/Redacted",
          label: "Redacted"
        },
        {
          type: "doc",
          id: "api/interfaces/RedactOptions",
          label: "RedactOptions"
        }
      ]
    },
    {
      type: "category",
      label: "Type Aliases",
      items: [
        {
          type: "doc",
          id: "api/type-aliases/Country",
          label: "Country"
        }
      ]
    },
    {
      type: "category",
      label: "Variables",
      items: [
        {
          type: "doc",
          id: "api/variables/COUNTRIES",
          label: "COUNTRIES"
        }
      ]
    },
    {
      type: "category",
      label: "Functions",
      items: [
        {
          type: "doc",
          id: "api/functions/keyFingerprint",
          label: "keyFingerprint"
        },
        {
          type: "doc",
          id: "api/functions/redact",
          label: "redact"
        },
        {
          type: "doc",
          id: "api/functions/remember",
          label: "remember"
        },
        {
          type: "doc",
          id: "api/functions/resolve",
          label: "resolve"
        }
      ]
    }
  ]
};
module.exports = typedocSidebar.items;