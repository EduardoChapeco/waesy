import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      "scratch",
      "scripts",
      "*.mjs",
      "*.cjs",
      "audit_variants.ts",
      "refactor_get.ts",
      "sanitize_variants.ts",
      "fix_*.ts",
      "temp_*.txt",
      ".lovable",
      ".codex",
      ".tanstack",
      ".audit",
      ".wrangler",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "warn",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "no-extra-boolean-cast": "warn",
      "no-irregular-whitespace": "warn",
      "no-unsafe-optional-chaining": "warn",
      "no-misleading-character-class": "warn",
    },
  },
  eslintPluginPrettier,
  {
    rules: {
      "prettier/prettier": "off",
    },
  },
);
