# Performance Improvements TODO

## Goal: Make View, edit_file, Delete, and Save operations instant

### Phase 1: VehicleList - Instant Load with Optimistic Delete
- [ ] 1.1 Remove loading spinner - show data from cache instantly
- [ ] 1.2 Add optimistic delete - remove from UI immediately, sync in background
- [ ] 1.3 Add background refresh indicator instead of full loading state

### Phase 2: Dashboard - Instant KPIs
- [ ] 2.1 Remove loading spinner from KPI cards
- [ ] 2.2 Show cached data immediately while fetching fresh data
- [ ] 2.3 Add subtle refresh indicator when data is being updated

### Phase 3: Edit Page - Fast Navigation
- [ ] 3.1 Use cached vehicles from VehicleList instead of re-fetching
- [ ] 3.2 Navigate between vehicles instantly using cached data

### Phase 4: Add/Save - Optimistic Feedback
- [ ] 4.1 Add page: Show success immediately, process in background
- [ ] 4.2 edit_file page: Show success immediately, process in background

### Phase 5: Shared Data Layer
- [ ] 5.1 Create a context or hook to share vehicle data across pages
- [ ] 5.2 Implement smart background refresh

## Implementation Order
1. VehicleList.tsx - Core component for viewing vehicles
2. Dashboard.tsx - Main landing page with KPIs
3. edit_file page - Faster vehicle navigation
4. Add page - Instant feedback on save
5. Context/hook - Share data across components

## Key Changes
- `loading` state → `isRefreshing` state (background only)
- Show data immediately from cache or initial state
- Optimistic UI updates for all mutations (add/edit/delete)
- Use localStorage as a fast cache layer

