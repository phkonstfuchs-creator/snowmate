import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/* Architecture rules. Each message names the rule and where it is
   explained, so whoever trips it (person or agent) can find the reason.
   See docs/ARCHITECTURE.md#enforced-boundaries. */
const SEE = "See docs/ARCHITECTURE.md#enforced-boundaries.";

const routesAreEntryPoints = {
  group: ["@/app/*", "@/app/**"],
  message: `Routes are entry points, not reusable code. Move what you need into features/ or components/. ${SEE}`,
};

const noFixtures = {
  group: ["@/lib/data", "@/lib/data/*", "**/lib/data", "**/lib/data/*"],
  message: `Real-data code must not read prototype fixtures. ${SEE}`,
};

/* Pure business rules: no UI, no framework, no infrastructure, no
   fixtures. Everything under features/ that is not a server boundary,
   a hook or a component. */
const domainModules = ["features/**/*.ts"];
const notDomain = [
  "features/**/*.test.ts",
  "features/**/actions.ts",
  "features/**/*-actions.ts",
  "features/**/queries.ts",
  "features/**/account-rights.ts",
  "features/**/use*.ts",
];

/* Server boundary: talks to Supabase, never to fixtures or UI. */
const serverBoundary = [
  "features/**/actions.ts",
  "features/**/*-actions.ts",
  "features/**/queries.ts",
  "features/**/account-rights.ts",
];

/* Hooks carry client state and, for the prototype, fixtures (useRideBoard
   falls back to them). Importing one would pull fixtures in indirectly. */
const noHooks = {
  regex: "(^|/)use[A-Z][A-Za-z]*$",
  message: `Hooks belong to the client. Rules and the server boundary must not import them. ${SEE}`,
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [routesAreEntryPoints] }],
    },
  },
  {
    files: domainModules,
    ignores: notDomain,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            routesAreEntryPoints,
            noFixtures,
            noHooks,
            {
              group: ["react", "react-dom", "next", "next/*", "@/components/*", "@/components/**", "@/hooks/*"],
              message: `Business rules stay independent of UI and framework code. ${SEE}`,
            },
            {
              group: ["@/lib/supabase/*"],
              message: `Business rules do not talk to the database; queries.ts and actions.ts do. ${SEE}`,
            },
            {
              regex: "(Screen|Sheet|Modal|Section|Sync)$",
              message: `Business rules must not depend on UI components. Put shared types in the rule module and import them from the UI. ${SEE}`,
            },
          ],
        },
      ],
    },
  },
  {
    /* Reusable components receive data as props; they never load sample
       data themselves. Demo-only UI lives in features/demo. */
    files: ["components/**/*.{ts,tsx}"],
    ignores: ["components/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            routesAreEntryPoints,
            {
              ...noFixtures,
              message: `Reusable components get their data as props and never read prototype fixtures. ${SEE}`,
            },
          ],
        },
      ],
    },
  },
  {
    /* Signed-in routes render real data only; /demo is where fixtures live. */
    files: ["app/(app)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [routesAreEntryPoints, noFixtures] }],
    },
  },
  {
    files: serverBoundary,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            routesAreEntryPoints,
            noFixtures,
            noHooks,
            {
              group: ["react", "@/components/*", "@/components/**"],
              message: `The server boundary returns data, not UI. ${SEE}`,
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    // Third-party MapLibre worker copied in by scripts/copy-maplibre-worker.mjs.
    "public/vendor/**",
    // The marketing website is its own Next.js project with its own lint
    // config and CI job (website/eslint.config.mjs, ci.yml "website").
    "website/**",
    // The store app shells (ADR 0031): generated native projects and the
    // asset script, see native/README.md.
    "native/**",
  ]),
]);

export default eslintConfig;
