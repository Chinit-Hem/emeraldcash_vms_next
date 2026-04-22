# Changelog

## [v0.2.0] - Unreleased (Prepare for GitHub Push)

### Fixed
- **tsconfig.json**: Added `ignoreDeprecations: "6.0"` to resolve VSCode deprecation warnings.
- **Database**: Consolidated duplicate exports in `src/lib/db.ts` → re-exports from `db-singleton.ts` (~80 lines removed).
- **Logger**: Created shared `src/lib/logger.ts`, updated userStore.ts, user-db.ts, auth API (removed 3 duplicate loggers, ~100 lines reduced).
- **ErrorBoundary**: Enhanced with formDebugger integration, retry/dashboard/reload UI, better error logging.
- **Neumorphic Cleanup** (partial): Cleaned cleaned-vehicles pages; pending vehicles/dashboard.

### Updated
- Docs: DUPLICATE_FIX_TODO.md, FIX_PROGRESS.md, NEUMORPHIC_CLEANUP_TODO.md (progress marked).

### In Progress
- Lint: 208 issues (73 errors) → fixing parsing errors, any types, react-hooks.
- Build test pending clean lint.

### Next
- Full lint/build pass.
- Git push.

## [v0.1.0] - Initial (2024)
- Next.js 16 app with Neon DB, Cloudinary, LMS/SMS/Vehicle mgmt.

