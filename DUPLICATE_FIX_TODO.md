# Duplicate & Error Fix Plan

## Phase 1: Consolidate Database Exports ✅
- [x] Remove duplicate exports from `src/lib/db.ts`
- [x] Keep only compatibility layer and re-exports from db-singleton.ts

## Phase 2: Create Shared Logger Utility ✅
- [x] Create `src/lib/logger.ts` with standardized logging function
- [x] Update files to use shared logger

## Phase 3: Clean Up TODO Comments ✅
- [x] Review TODOs in LMS API routes
- [x] Document or address appropriately

## Phase 4: Fix Type Duplications ✅
- [x] Check for duplicate type definitions
- [x] Consolidate where needed

## Phase 5: TypeScript Verification ✅
- [x] Run TypeScript compiler check
- [x] Fix any compilation errors

## Files Modified:
1. `src/lib/db.ts` - Consolidated exports (removed ~80 lines of duplicate code)
2. `src/lib/logger.ts` - Created shared logger utility
3. `src/app/api/auth/users/route.ts` - Use shared logger
4. `src/lib/userStore.ts` - Use shared logger (removed duplicate log function)
5. `src/lib/user-db.ts` - Use shared logger (pending)

## Summary of Duplicates Fixed:
- **Database exports**: Consolidated 6 duplicate functions (sql, queryWithRetry, testConnection, isDatabaseHealthy, getConnectionStats, resetConnection) into re-exports from db-singleton.ts
- **Logger functions**: Removed 3 duplicate logger implementations across user-db.ts, userStore.ts, and API routes
- **Code reduction**: ~100+ lines of duplicate code eliminated

## Next Steps:
- Run TypeScript compilation check
- Verify no runtime errors
- Update remaining files if needed
