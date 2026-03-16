# ECVMS Code Cleanup Plan

## Critical Issues (Must Fix)

### 1. Merge Conflict in clientImageCompression.ts
- **File**: `src/lib/clientImageCompression.ts`
- **Issue**: Git merge conflict markers present (`<<<<<<< HEAD`, `=======`, `>>>>>>> 1d6d06858edb1b454edb1607a9d8c119464b3b64`)
- **Action**: Resolve conflict by keeping the optimized version (reduced defaults)

### 2. Remove Debug Console Logs
- **Files**: Multiple files across src/
- **Count**: 287 console.log/error/warn in .ts, 76 in .tsx
- **Action**: 
  - Remove development-only console.log statements
  - Keep error logging for production
  - Convert debug logs to use proper logger utility

### 3. Clean Up Unused Imports
- **Files**: Multiple API routes and components
- **Action**: Remove unused imports identified by static analysis

## Files to Modify

### High Priority
1. `src/lib/clientImageCompression.ts` - Fix merge conflict
2. `src/lib/cloudinary.ts` - Remove debug logs, check unused code
3. `src/services/BaseService.ts` - Remove debug logs
4. `src/app/api/vehicles/[id]/route.ts` - Remove debug logs
5. `src/app/components/vehicles/useUpdateVehicleOptimistic.ts` - Remove debug logs

### Medium Priority
6. `src/lib/api.ts` - Remove debug logs
7. `src/lib/vehicleCache.ts` - Remove debug logs
8. `src/lib/useVehicles.ts` - Remove debug logs
9. `src/app/components/AppShell.tsx` - Remove debug logs
10. `src/app/login/page.tsx` - Remove debug logs

## Cleanup Strategy

1. **Fix merge conflicts first** (critical)
2. **Remove console.log statements** that are for debugging only
3. **Keep error handling** but make it production-ready
4. **Remove unused imports** and variables
5. **Verify no functional changes** - only cleanup

## Success Criteria

- [ ] No merge conflict markers in any file
- [ ] Console.log statements reduced by 80%+
- [ ] No unused imports
- [ ] All tests pass
- [ ] Application builds successfully
- [ ] No functional regressions
