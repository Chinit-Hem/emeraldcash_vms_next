# Performance Optimization TODO

## Issues to Fix
- [x] View vehicle delay - Add prefetching for instant navigation
- [x] Add/Save delay - Optimize image upload and API flow

## Implementation Plan

### 1. Optimize useUpdateVehicleOptimistic.ts ✅ COMPLETED
- [x] Parallelize Cloudinary upload with API preparation
- [x] Reduce image compression settings (800px max, 0.7 quality)
  - COMPRESSION_MAX_WIDTH: 1280 → 800
  - COMPRESSION_QUALITY: 0.75 → 0.7
- [x] Add progress state for better UX
- [x] Optimize retry logic with faster initial delays
  - MAX_RETRY_ATTEMPTS: 3 → 2
  - RETRY_DELAY_MS: 1000 → 500
  - MAX_CLOUDINARY_RETRIES: 2 → 1
  - CLOUDINARY_RETRY_DELAY: 500 → 300

### 2. Optimize useAddVehicleOptimistic.ts ✅ COMPLETED
- [x] Apply same optimizations as update hook
  - COMPRESSION_MAX_WIDTH: 1280 → 800
  - COMPRESSION_QUALITY: 0.75 → 0.7
  - MAX_RETRY_ATTEMPTS: 3 → 2
  - RETRY_DELAY_MS: 1000 → 500
  - MAX_CLOUDINARY_RETRIES: 1 (new constant)
  - CLOUDINARY_RETRY_DELAY: 300 (new constant)
- [x] Remove full refetch() call after success
- [x] Use optimistic updates instead

### 3. Add Prefetching to VehiclesClient.tsx ⏳ PENDING
- [ ] Add router.prefetch() on vehicle cards
- [ ] Prefetch on hover/touch start for mobile
- [ ] Add priority loading for visible vehicles

## Testing Checklist
- [ ] Test view vehicle navigation speed
- [ ] Test add vehicle with image
- [ ] Test update vehicle with image
- [ ] Test on mobile (iOS Safari)
- [ ] Verify optimistic updates work correctly
