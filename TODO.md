**🚀 PRODUCTION BUILD FIX - Zero Errors Target (BLACKBOXAI BRANCH)**

**Current Status (Post-Lint):** 199 problems (57 errors, 142 warnings) → Targeting 0 errors/0 warnings
**Lint Summary:** @typescript-eslint/no-explicit-any (most critical), react-hooks/*, @next/next/no-img-element, no-html-link-for-pages, set-state-in-effect, etc.
**Goal:** Clean `npm run lint` + `npm run build`

## ✅ PHASE 1 COMPLETE: Syntax Errors Fixed (7/7 files)
```
[x] src/app/(app)/sms/history/page.tsx - any[] → interfaces
[x] src/app/sms/assets/[id]/edit/page.tsx - className/useEffect deps
[x] src/app/api/sms/stats/route.ts - console.error → logger
[x] src/services/SmsService.ts - any → Record<string,unknown>
[x] src/app/api/sms/assets/[id]/route.ts - Missing }/types
[x] src/app/cleaned-vehicles/page.tsx - JSX/img → Next/Image
[x] src/lib/db/*.ts - Invalid chars → clean
```

## 🔄 PHASE 2: Fix 57 Errors + 142 Warnings (IN PROGRESS)
**High Priority Errors (Fix First):**
```
1. no-explicit-any (~25): SmsService.ts (8), VehicleService.ts (5), formDebugger.tsx (10+), cloudinary-sms.ts, API routes
2. react-hooks/set-state-in-effect (6): LazyLoadWrapper, OptimizedImage, VehicleFormNew, useVehicles, formDebugger
3. react-hooks/immutability/refs (2): InstantNavigationProvider, useVehicleFormUnified
4. @next/next/no-html-link-for-pages (5): EnhancedDashboard.tsx → Link
5. no-img-element (~15): Replace <img> → next/image (VehicleCard, etc.)
6. no-empty-object-type: Add members or use Record<>
7. react-compiler/preserve-manual-memoization: Fix deps in AuthContext
```

**Warnings (Auto + Manual):**
- `npm run lint -- --fix` for unused-vars/exhaustive-deps
- Manual: useCallback deps, unused imports

## 🧪 PHASE 3: Build & Test
```
[ ] npm run lint → 0 errors/warnings
[ ] npm run build → Success (no tsc errors)
[ ] node scripts/test-neon-connection.mjs
[ ] Manual test: dev server + key pages (vehicles, sms, lms)
```

## 📦 PHASE 4: Git + Vercel Deploy
```
[ ] git checkout -b blackboxai/fix-all-errors
[ ] git add . && git commit -m "fix: resolve all lint/tsc errors, optimize for prod (0 errors)"
[ ] git push -u origin blackboxai/fix-all-errors
[ ] gh pr create --title "Fix all code errors: 0 lint/tsc/build issues" --body "Ready for Vercel prod deploy"
[ ] Vercel: Auto-deploy on merge
```

**Progress Tracking:**
- Step 1: Run `npm run lint -- --fix`
- Step 2: Fix remaining 57 errors (prioritized list above)
- Step 3: `npm run lint && npm run build`
- Step 4: Git PR

**Run Commands After Each Step:** `npm run lint`
**Vercel Impact:** Clean build = <5s deploys, zero runtime errors

