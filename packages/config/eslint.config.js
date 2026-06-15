import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

// Shared flat ESLint config. Packages extend this via `@spendlio/config/eslint`.
// Kept minimal to start: typescript-eslint recommended + prettier (turns off
// stylistic rules that conflict with the formatter).
export default tseslint.config(
  { ignores: ["dist/**", ".next/**", ".turbo/**", "coverage/**"] },
  ...tseslint.configs.recommended,
  prettier,
);
