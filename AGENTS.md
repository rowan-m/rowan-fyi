# Project: rowan.fyi

Welcome, Agent. You are contributing to a personal portfolio and blog built with **Astro**. This project also serves as a host for numerous standalone experiments imported from Glitch.

## 🏗 Architecture & Tech Stack

- **Framework:** [Astro 6+](https://astro.build/)
- **Content:** Managed via [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) in `src/content/`.
- **Styling:** Primarily CSS (Vanilla CSS preferred).
- **Standalone Demos:** Located in `public/made/`. These are self-contained HTML/JS/CSS projects.
- **Testing:** [Vitest](https://vitest.dev/) for unit and integration testing.
- **Linting & Quality:**
  - `eslint` with `sonarjs` and `security` plugins.
  - `dependency-cruiser` to enforce architectural boundaries.
  - `prettier` for consistent formatting.

## 📁 Key Directories

- `src/content/posts/`: Markdown/MDX files for blog posts.
- `src/pages/`: Astro pages and dynamic routes.
- `src/components/`: Reusable Astro components.
- `src/layouts/`: Common page layouts.
- `public/made/`: Standalone legacy demos. Each folder is an independent project.
- `.idx/`: Configuration for Google Project IDX development environment.
- `.github/workflows/`: CI/CD pipelines for Google Cloud Run.
- `scripts/`: Helper scripts for maintenance tasks.

## 🛠 Development Workflow

### Standard Commands

- `npm run dev`: Start local development server.
- `npm run build`: Build for production.
- `npm run format`: Format code with Prettier.
- `npm run check`: Run all quality checks (Lints, Tests, DepCruise). **Always run this before finishing a task.**

### Linting Details

We take code quality seriously. There are specialized linting configurations:

- `npm run lint:sonar`: Checks for code smells and maintainability.
- `npm run lint:security`: Checks for common security vulnerabilities.

## 📜 Coding Standards

1. **Type Safety:** Use TypeScript for all new logic in `src/`.
2. **Component Structure:** Prefer functional components and Astro components over complex class-based structures.
3. **Vanilla CSS:** Aim for clean, modern Vanilla CSS. Avoid adding large CSS frameworks unless specifically requested.
4. **Aliases:** Use `@/` as an alias for the `src/` directory (e.g., `import Header from "@/components/Header.astro"`).
5. **Demos:** When modifying or adding to `public/made/`, remember these are often legacy projects. Maintain their standalone nature unless migrating them to Astro components.
6. **Tests:** All new logic should include corresponding tests in Vitest.

## 🚦 Quality Gate

Your changes are considered complete only when `npm run check` passes entirely. This includes:

- Prettier formatting.
- Standard ESLint.
- SonarJS & Security Lints.
- Dependency Cruiser checks.
- Vitest execution.

## 💡 Proactive Advice

- If you notice "nasty" code (as mentioned in README.md), prioritize refactoring it into cleaner, more maintainable patterns while staying within the scope of your task.
- Check `src/content.config.ts` for schema definitions before adding or modifying blog posts.
