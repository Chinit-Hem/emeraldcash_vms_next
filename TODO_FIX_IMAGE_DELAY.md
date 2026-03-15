# Fix Image Update/Save Delay - Implementation Plan

## Problem
Double compression causing 2-5 second delay when updating and saving images:
1. VehicleForm.tsx compresses image (maxWidth: 1200)
2. useUpdateVehicleOptimistic.ts compresses again (maxWidth: 800)

## Solution
Skip second compression if file is already optimized

## Implementation Steps

- [x] 1. Create TODO file
- [ ] 2. Modify useUpdateVehicleOptimistic.ts to check file size before compression
- [ ] 3. Add threshold constant for skipping compression (e.g., < 500KB)
- [ ] 4. Update VehicleForm.tsx to pass compression metadata if needed
- [ ] 5. Test the fix to ensure upload still works correctly
- [ ] 6. Verify delay is reduced

## Files to Modify
1. src/app/components/vehicles/useUpdateVehicleOptimistic.ts
2. src/app/components/vehicles/useAddVehicleOptimistic.ts (same issue likely exists)
