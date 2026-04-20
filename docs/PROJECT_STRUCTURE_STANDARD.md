# Project Structure Standard

This project follows a practical Next.js structure that keeps code discoverable and maintainable.

## Standard Layout

```text
.
├── docs/                # Architecture notes, plans, migration docs
├── public/              # Static assets
├── scripts/             # Dev and maintenance scripts
├── src/
│   ├── app/             # Next.js routes, layouts, pages, API route handlers
│   ├── components/      # Shared components (reusable across features)
│   ├── config/          # Runtime/static config
│   ├── lib/             # Utilities, adapters, hooks, low-level modules
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic layer
│   ├── styles/          # Global/shared styles
│   └── types/           # Global type definitions
└── tests/               # Automated tests
```

## Rules

1. Keep shared UI in `src/components`, not inside route folders.
2. Keep page-local components close to their route in `src/app`.
3. Keep data logic in `src/repositories` and business logic in `src/services`.
4. Keep infrastructure code in `src/lib` and split by concern (`db`, `auth`, `cache`, `utils`).
5. Keep plans/guides/reports inside `docs` instead of root.
6. Avoid spaces in file names.
7. Remove `.DS_Store` and other generated OS artifacts from source folders.

## Team Workflow

- Run `npm run structure:check` before major refactors.
- If a new module is added, place it using the rules above.
- Prefer consistency over novelty: reuse existing conventions before introducing new folder patterns.
