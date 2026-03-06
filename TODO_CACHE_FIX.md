# Cache and Counter Logic Fix - Implementation Plan

## Issues to Fix:
1. Server-side cache doesn't use Next.js revalidation
2. Client-side cache lacks staleness detection
3. GET handler ignores noCache parameter
4. No coordination between mutations and cache invalidation

## Implementation Steps:

### 1. ✅ src/lib/vehicleCache.ts - Enhanced Cache Logic
- [x] Add `lastMutationTime` tracking in localStorage
- [x] Add `isCacheStale()` function to compare cache timestamp with last mutation
- [x] Add `shouldUseCache()` function that returns false if cache is stale
- [x] Modify `refreshVehicleCache()` to always fetch fresh data

### 2. ✅ src/lib/api.ts - Add Mutation Tracking
- [x] Add `lastMutationTime` tracking functions
- [x] Modify `getVehicles` to check cache staleness
- [x] Update mutation methods (addVehicle, updateVehicle, deleteVehicle) to set lastMutationTime

### 3. ✅ src/lib/useVehicles.ts - Fix Cache Logic
- [x] Add logic to check if cache is stale before using it
- [x] Force `noCache = true` when data has been modified
- [x] Ensure count is always fetched from database when cache is stale

### 4. ✅ src/app/api/vehicles/route.ts - Add Revalidation
- [x] Import `revalidatePath` and `revalidateTag` from `next/cache`
- [x] Add `revalidateTag('vehicles')` on POST operation
- [x] Fix GET to actually respect `noCache` parameter

### 5. ✅ src/app/api/vehicles/[id]/route.ts - Add Revalidation
- [x] Import `revalidateTag` from `next/cache`
- [x] Add `revalidateTag('vehicles')` after PUT and DELETE operations

## Testing Steps:
- [ ] Test cache invalidation after Create operation
- [ ] Test cache invalidation after Update operation
- [ ] Test cache invalidation after Delete operation
- [ ] Verify counter updates correctly
- [ ] Ensure noCache parameter works as expected
