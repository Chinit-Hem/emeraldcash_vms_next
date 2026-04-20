# Folder Grouping Check (VMS / LMS / SMS)

This file groups the current codebase by domain to keep structure clear before commit/push.

## VMS (Vehicle Management System)

### App Routes
- `src/app/(app)/vehicles/*`
- `src/app/cleaned-vehicles/*`
- `src/app/(app)/dashboard/page.tsx`

### API Routes
- `src/app/api/vehicles/*`
- `src/app/api/cleaned-vehicles/route.ts`
- `src/app/api/dashboard/stats/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/market-price/*`

### Components / Logic
- `src/app/components/vehicles/*`
- `src/app/components/dashboard/*`
- `src/services/VehicleService.ts`
- `src/lib/useVehicles.ts`
- `src/lib/useVehiclesNeon.ts`
- `src/lib/useVehicleForm.ts`
- `src/lib/useVehicleFormUnified.ts`

## LMS (Learning Management System)

### App Routes
- `src/app/(app)/lms/*`
- `src/app/(app)/admin/lms/page.tsx`

### API Routes
- `src/app/api/lms/*`

### Components / Logic
- `src/app/components/lms/*`
- `src/services/LmsService.ts`
- `src/repositories/LmsRepository.ts`
- `src/lib/lms-types.ts`
- `src/lib/lms-cache.ts`
- `src/lib/lms-entities.ts`
- `src/lib/lms-validation.ts`

## SMS (Stock/Supply Management System)

### App Routes
- `src/app/(app)/sms/*`
- `src/app/sms/*`
- `src/app/stock/*`

### API Routes
- `src/app/api/sms/*`
- `src/app/api/stock/route.ts`

### Components / Logic
- `src/services/SmsService.ts`
- `src/lib/sms-types.ts`
- `src/lib/sms-schema.ts`
- `src/lib/cloudinary-sms.ts`
- `src/lib/stock-service.ts`
- `src/lib/stock-schema.ts`

## Shared / Cross-Domain

- `src/app/components/*` (currently mixed shared + feature components)
- `src/components/ui/*`
- `src/lib/*` (shared utilities, auth, logger, db schema, i18n)

## Markdown Files (`*.md`) Status

### In `docs/` (good location)
- `docs/PROJECT_STRUCTURE_STANDARD.md`
- `docs/FOLDER_STRUCTURE_ANALYSIS.md`
- `docs/DESIGN_OPTIMIZATION_PLAN.md`
- `docs/REFACTORING_PLAN.md`
- `docs/VEHICLE_REDESIGN_PLAN.md`
- `docs/RAM_OPTIMIZATIONS.md`
- `docs/FIX_PROGRESS.md`

### Still in root (recommend move to `docs/`)
- `LMS_TEST_DATA_GUIDE.md`
- `TIMEOUT_FIX_TODO.md`

## Recommended Next Step

Before push/deploy, create 3 top-level feature groups under `src/features/` (`vms`, `lms`, `sms`) and gradually migrate feature-specific components/services there while keeping `src/components/ui` and shared `src/lib` untouched.
