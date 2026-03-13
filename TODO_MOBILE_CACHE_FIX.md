# Mobile UI & Cache Fix Implementation Plan

## Summary
All fixes have been successfully implemented to address the 4 main issues:

1. **Mobile UI Responsiveness** - Fixed sidebar overlap and header button alignment
2. **Stale Cache (482M+ ms)** - Added cache clearing on mount with age detection
3. **Image Upload Failure** - Added Cloudinary retry logic and ensured Base64 never sent to API
4. **Case Sensitivity** - Already implemented in Dashboard.tsx (verified)

## Files Modified

### 1. src/app/components/AppShell.tsx ✅
- Changed mobile header from sticky to fixed positioning
- Added `pt-14 lg:pt-0` to main content area for fixed header spacing
- Increased sidebar drawer z-index from z-50 to z-[60] to prevent overlap
- Added `max-w-[100vw]` to prevent horizontal overflow
- Added `min-w-0` and `truncate` to header text for proper text handling
- Changed main content padding from `pb-24 lg:pb-24` to `pb-safe pt-4 lg:pt-0`

### 2. src/lib/vehicleCache.ts ✅
- Added `MAX_CACHE_AGE_MS = 30 * 60 * 1000` (30 minutes)
- Added `getCacheAge()` function to calculate cache age in ms
- Added `isCacheExtremelyStale()` to detect cache older than 30 min
- Added `clearCacheOnMount()` to clear cache when extremely stale
- Bumped `CURRENT_CACHE_VERSION` from "4" to "5" to force cache refresh

### 3. src/lib/useVehicles.ts ✅
- Added import for `clearCacheOnMount` and `getCacheAge`
- Added mount effect that calls `clearCacheOnMount()` with logging
- Cache age is now logged on every mount for debugging

### 4. src/app/components/vehicles/useUpdateVehicleOptimistic.ts ✅
- Added `MAX_CLOUDINARY_RETRIES = 2` and `CLOUDINARY_RETRY_DELAY = 500`
- Created `uploadImageToCloudinaryWithRetry()` wrapper function
- Updated both image upload paths (File and Base64) to use retry function
- Retry logic skips configuration errors (won't retry bad config)
- Base64 is converted to File before upload, never sent to API
- Cloudinary URL (`secure_url`) is used in API payload as `image_id`

### 5. src/app/components/VehicleList.tsx ✅
- Restructured header into two rows for better mobile layout
- Main actions (Show/Hide Filters) use `flex-1 sm:flex-none` for full width on mobile
- Secondary actions (Clear, Refresh) wrap in a flex container
- Filter toggles and Print button in second row with `flex-wrap`
- Vehicle count aligned to right with `ml-auto`
- Added `min-h-[40px]` to all buttons for consistent touch targets
- Shortened button labels for mobile: "All images" / "No image" vs full text

## Testing Checklist
- [ ] Test on iOS Safari - verify sidebar doesn't overlap content
- [ ] Test on Android Chrome - verify header buttons align properly
- [ ] Verify cache clears after 30 minutes of inactivity
- [ ] Test image upload with retry logic
- [ ] Verify Base64 images are converted before API call
- [ ] Confirm Cloudinary URL is used in database, not Base64

## Notes
- Case sensitivity for brand grouping was already implemented in Dashboard.tsx using `.toUpperCase()`
- The stale cache issue (482643290 ms ≈ 5.6 days) will now be detected and cleared automatically
- Mobile header is now fixed position with proper safe area handling
- All image uploads now have retry logic to handle transient Cloudinary failures
