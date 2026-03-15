# Optimistic UI & Performance Optimization - Implementation Checklist

## Phase 1: Minimize Retry Delays
- [ ] Update useUpdateVehicleOptimistic.ts
  - [ ] Reduce RETRY_DELAY_MS from 300ms to 100ms
  - [ ] Reduce CLOUDINARY_RETRY_DELAY from 200ms to 100ms
  - [ ] Remove exponential backoff (use fixed delays)
- [ ] Update useAddVehicleOptimistic.ts
  - [ ] Apply same delay optimizations

## Phase 2: Asynchronous Cache Revalidation
- [ ] Update useUpdateVehicleOptimistic.ts
  - [ ] Make recordMutation() fire-and-forget with setTimeout
- [ ] Update useAddVehicleOptimistic.ts
  - [ ] Make recordMutation() fire-and-forget with setTimeout

## Phase 3: Optimistic UI for Compressed Image Preview
- [ ] Update VehicleForm.tsx
  - [ ] Add state for compressed image preview URL
  - [ ] Show compressed preview immediately when save clicked
  - [ ] Display compression stats (size reduction)
  - [ ] Pre-compress image in background on file selection

## Phase 4: Testing
- [ ] Test Add Vehicle flow
- [ ] Test Edit Vehicle flow
- [ ] Verify compressed preview shows immediately
- [ ] Verify minimal retry delays
- [ ] Verify async cache revalidation
