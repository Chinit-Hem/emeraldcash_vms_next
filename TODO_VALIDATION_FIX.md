# Vehicle Form Validation Fix - TODO

## Problem
500 Internal Server Error: "invalid input syntax for type integer: 'undefined'"

## Root Cause
- `VehiclesClient.tsx`: `handleSaveVehicle` only checks `value != null`, not `undefined`
- `String(undefined)` returns `"undefined"` which PostgreSQL cannot parse as integer
- `VehicleForm.tsx`: Number parsing can produce `NaN` values that aren't handled

## Implementation Plan

### Step 1: Fix VehiclesClient.tsx
- [ ] Add `sanitizeVehicleData` helper function to clean undefined/NaN values
- [ ] Update `handleSaveVehicle` to sanitize data before sending to API
- [ ] Ensure number fields (Year, PriceNew, Price40, Price70) are properly converted

### Step 2: Fix VehicleForm.tsx  
- [ ] Fix `parseInt`/`parseFloat` calls to handle NaN results
- [ ] Add defensive checks for number field changes
- [ ] Ensure form state never contains undefined for number fields

### Step 3: Verification
- [ ] Run TypeScript lint check
- [ ] Verify no type errors

## Files to Edit
1. `src/app/(app)/vehicles/VehiclesClient.tsx`
2. `src/app/components/vehicles/VehicleForm.tsx`
