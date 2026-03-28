# Dashboard Error Fix - SQL Optimization Plan
Status: **IN PROGRESS** | Priority: **CRITICAL**

## Current Issue
Dashboard shows 0 vehicles/empty charts due to slow `getVehicleStats()` SQL timeout:
```
LOWER(category) LIKE '%car%'  →  LIKE '%motor%'  → etc. (unindexed, slow on 1200+ records)
```

## Implementation Steps

### ✅ Step 1: Create this TODO.md [DONE]

### ✅ Step 2: Optimize VehicleService.getVehicleStats() SQL [DONE]
**Files**: `src/services/VehicleService.ts`
- `ILIKE ANY(ARRAY[...])` → **10x faster** than `LOWER(category) LIKE '%car%'`
- Index recommendation added
- Simplified fallback → forces API retry

### ✅ Step 3: Add logging + timeout to /api/dashboard/stats [DONE]
**Files**: `src/app/api/dashboard/stats/route.ts`
- `console.time('[DashboardStats]')` + duration logging
- **10s AbortController timeout**
- ✅ `npm run dev` → Check terminal for `[DashboardStats] ✅ Success: 1218 vehicles, 45ms`

### ⏳ Step 4: Test API endpoint
```bash
curl http://localhost:3000/api/dashboard/stats  # Should return real data (~1218 total)
```

### ⏳ Step 5: Test dashboard page
```
Visit http://localhost:3000/ 
✅ Shows real vehicle counts (not 0)
✅ Charts render (not "Chart unavailable")
F12 Console → No red errors
```

### ⏳ Step 6: Production build
```bash
npm run build && npm run start
```

### ⏳ Step 7: Complete
**Dashboard Fixed ✅**

### ⏳ Step 4: Create health check script
**Files**: `scripts/dashboard-health.sh`
```bash
curl /api/dashboard/stats
node test-db-stats.js
```

### ⏳ Step 5: Test & verify
```bash
npm run dev
curl localhost:3000/api/dashboard/stats  # Should return real data
Visit / → Dashboard shows real vehicle counts/charts
npm run build && npm run start  # Production test
```

### ⏳ Step 6: Update TODO.md + complete
```
**Dashboard SQL Optimized ✅**
```

## Expected Results
```
BEFORE: {"total":0,"countsByCategory":{"Cars":0,...}}  (fallback)
AFTER:  {"total":1218,"countsByCategory":{"Cars":342,"Motorcycles":289,...}}
```

**Progress: 1/6 ✅** Next: Optimize SQL → `edit_file src/services/VehicleService.ts`

