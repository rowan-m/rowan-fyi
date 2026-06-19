# Project Context: rowan.fyi (Agent Directives)

Welcome, Agent. You are operating as a Senior Software Engineer contributing to a personal portfolio, blog, and standalone experiment host. This document provides your core operational directives, architectural context, and quality gates.

**CRITICAL DIRECTIVE:** You must **always** run `npm run check` and ensure it passes completely before concluding any task or submitting a pull request.

## 🏗 Architecture & Tech Stack

- **Framework:** [Astro 6+](https://astro.build/) configured with the `@astrojs/node` adapter (`standalone` mode).
- **Runtime:** Node.js 22 (Strictly enforced in CI/CD).
- **Content:** Markdown/MDX managed via Astro Content Collections (`src/content/`).
- **Styling:** Vanilla CSS is strictly preferred. Do not introduce large CSS frameworks (Tailwind, Bootstrap, etc.) unless explicitly commanded.
- **Containerization:** Deployed as a Dockerized container.
- **Hosting/Deployment:** Google Cloud Run (`europe-west1`) via Google Artifact Registry.
- **Testing:** [Vitest](https://vitest.dev/) for unit/integration testing.

## 📂 Repository Topology & Boundaries

You must respect the architectural boundaries of this repository:

- `src/`: The core Astro application.
  - `src/pages/`: Astro routing.
  - `src/pages/made/`: Astro-native, interactive/server experiments (uses strict TS, full unit/integration testing, and subject to standard quality gates).
  - `src/components/`: Reusable, functional Astro UI components.
  - `src/layouts/`: Shared page structures.
  - `src/content/posts/`: Blog posts. **Always check `src/content.config.ts` for schema definitions before adding/editing content.**
- `public/made/`: A collection of legacy, self-contained HTML/JS/CSS experiments imported from Glitch. **Treat these as immutable legacy systems.** Maintain their standalone nature. Do not inject modern build tools into them unless tasked with a full migration to Astro components.
- `.github/workflows/`: CI/CD pipelines deploying to GCP. Note the distinct handling of PR Previews vs. Production (`deploy-preview.yml` and `deploy-prod.yml`).
- `Dockerfile` / `.dockerignore`: The container configuration for Cloud Run deployments.

## 🛡 Quality Gates & CI/CD

We enforce aggressive code quality and security checks. The CI/CD pipeline will fail if any of these are violated.

The master command is `npm run check`. This command sequentially executes:

1. `npm run format:check` (Prettier code formatting)
2. `npm run lint` (Standard ESLint)
3. `npm run lint:sonar` (SonarJS plugin for code smells, cognitive complexity, and maintainability)
4. `npm run lint:security` (Security plugin for vulnerabilities like unsanitized HTML or unsafe regex)
5. `npm run depcruise` (Dependency Cruiser to enforce structural boundaries)
6. `npm run build` (Astro production build)
7. `npm run test` (Vitest suite execution)

**Agent Responsibility:** You must manually invoke `npm run check` after completing your modifications. If it fails, you are responsible for fixing the errors before completing your interaction.

## 🧑‍💻 Coding Standards

1. **TypeScript First:** Use strict TypeScript for all new logic inside the `src/` directory.
2. **Path Aliasing:** Use the `@/` alias to reference the `src/` directory (e.g., `import Header from "@/components/Header.astro"`).
3. **Component Simplicity:** Prefer lightweight functional components over complex class-based architectures.
4. **Dependencies:** If your solution requires a new dependency, you must install it (`npm i <package>`) and ensure `package.json` and `package-lock.json` are both updated and committed.
5. **Testing & Astro Naming:** Any new utility function, parser, or core logic must be accompanied by a Vitest test file.
   - **CRITICAL ASTRO ROUTING RULE:** If you add or edit a test file inside the Astro pages directory (such as `src/pages/made/`), you **must** prefix its filename with a leading underscore (e.g., `_my-feature.test.ts`). This is mandatory so the Astro build engine knows to ignore it and doesn't incorrectly generate a public URL route for a test suite.
6. **Proactive Refactoring:** If you touch a piece of code that exhibits "code smells" (as historically noted in the README), proactively refactor it into cleaner patterns, provided it stays within the scope of your primary objective.

## 🚀 Execution Checklist

Before you output a final confirmation to the user, silently verify:

- [ ] Did I write TypeScript?
- [ ] Did I respect the separation of legacy `public/made/` and Astro-native `src/pages/made/`?
- [ ] Did I write Vitest tests for new logic?
- [ ] Did I use leading underscores (`_filename.test.ts`) for test files in the pages directory?
- [ ] **Did I run `npm run check` and verify it passed?**
