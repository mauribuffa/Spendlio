# Build step 01 · Monorepo skeleton

Goal: an installable pnpm + Turborepo workspace with shared TS/lint config.

## Files

**`package.json`** (repo root)
```json
{
  "name": "spendlio",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "pnpm --filter @spendlio/db generate",
    "db:migrate": "pnpm --filter @spendlio/db migrate",
    "db:seed": "pnpm --filter @spendlio/db seed",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.5.0",
    "prettier": "^3.3.0"
  }
}
```

**`pnpm-workspace.yaml`**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`turbo.json`**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] }
  }
}
```

**`.gitignore`**
```
node_modules
dist
.next
.turbo
.env
*.log
coverage
```

**`tsconfig.base.json`** (repo root — every package extends this)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "composite": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## `packages/config`
A package other packages depend on for shared config.

**`packages/config/package.json`**
```json
{
  "name": "@spendlio/config",
  "version": "0.0.0",
  "private": true,
  "files": ["tsconfig.base.json", "eslint.config.js"]
}
```
Put a thin `eslint.config.js` (flat config) here too (typescript-eslint recommended + prettier). Keep it minimal to start.

## A package's tsconfig (pattern for every package)
**`packages/<name>/tsconfig.json`**
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"], "compilerOptions": { "outDir": "dist", "rootDir": "src" } }
```

## Acceptance
```bash
pnpm install        # resolves the workspace, links @spendlio/* once they exist
pnpm typecheck      # no-op until packages exist; must not error
```
The workspace installs and Turborepo runs. No packages have code yet — that's the next steps.
