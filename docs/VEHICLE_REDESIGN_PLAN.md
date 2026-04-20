# Vehicle Details & Edit Page Redesign Plan

## Information Gathered

### Current Files Analyzed:
1. **src/app/(app)/vehicles/[id]/view/page.tsx** - Combined view/edit page with toggle mode
2. **src/app/(app)/vehicles/[id]/edit/page.tsx** - Separate edit page with view/edit toggle
3. **src/lib/types.ts** - Vehicle type definitions and metadata

### Current Layout Issues:
- Header navigation is basic with only Back button
- Action buttons (Edit/Delete) are scattered at bottom of page
- Stats display is functional but lacks visual hierarchy
- No status badges for Condition field
- No special handling for TukTuk category icon
- Edit mode uses standard inputs without floating labels
- Layout could be more professional with better card organization

## Redesign Plan

### 1. Visual Layout - Split View Design
**File: src/app/(app)/vehicles/[id]/view/page.tsx**

- **Left Column (40%)**: Large vehicle preview card
  - High-quality image with hover zoom effect
  - Vehicle ID badge overlay
  - Category icon (special TukTuk icon support)
  
- **Right Column (60%)**: Stacked data cards
  - Primary Stats Card (Market Price, DOC 40%, 70%)
  - Technical Specs Card (2-column grid)
  - Additional Details Card
  - Quick Info Sidebar

### 2. Header Action Bar
**New Component: src/app/components/vehicles/VehicleHeader.tsx**

- Sticky top bar with glassmorphism effect
- Left: Back button with breadcrumb
- Center: Page title with vehicle identifier
- Right: Grouped action buttons
  - Edit button: Emerald Green (#10b981) with Edit3 icon
  - Delete button: Soft Red (#f43f5e) with Trash2 icon
  - Both buttons have icons and rounded-xl styling

### 3. Information Grouping - White Cards with Soft Shadows
**Style Specifications:**
- Background: White (#ffffff)
- Border radius: rounded-2xl (1rem)
- Shadow: shadow-lg with custom soft shadow
- Border: 1px solid slate-100
- Padding: p-6 (1.5rem)
- Gap between cards: gap-6 (1.5rem)

### 4. Primary Stats Section
**Enhanced Stats Display:**
- Market Price: Large bold text (text-3xl), emerald color, light emerald background tint
- DOC 40%: Medium text (text-xl), slate color, light rose background tint
- 70%: Medium text (text-xl), slate color, light blue background tint
- Grid layout: 3 columns on desktop, stacked on mobile
- Each stat in its own tinted card with label

### 5. Technical Specs - 2-Column Grid
**Fields to Display:**
- Brand
- Model
- Year
- Plate Number
- Body Type
- Color (with color dot indicator)

**Layout:**
- 2-column grid on desktop
- 1-column on mobile
- Clean labels with uppercase tracking
- Values in semibold

### 6. Professional UI Elements

**Status Badge for Condition:**
- Green pill badge for "Used" condition
- Blue pill for "New" condition
- Gray pill for other conditions
- Rounded-full with px-3 py-1

**TukTuk Icon Support:**
- Check if category is "Tuk Tuk" or "TukTuks"
- Display custom SVG icon instead of generic category badge
- Icon positioned in vehicle header

### 7. Edit Form Logic - Floating Labels
**Enhanced Input Components:**
- Shadow input fields with floating labels
- Transition animation on focus
- Emerald ring on focus
- Error states with rose ring
- Disabled states with slate background

**Input Types:**
- Text inputs for Brand, Model, Plate, etc.
- Number input for Year with min/max
- Number input for Market Price with real-time calculation
- Select dropdown for Category
- Textarea for Description

### 8. Calculated Fields - Real-time Updates
**Logic Implementation:**
- When Market Price changes, automatically calculate:
  - DOC 40% = Market Price * 0.4
  - 70% = Market Price * 0.7
- Display calculated values in read-only fields
- Show "Auto-calculated" helper text

### 9. Styling Specifications

**Color Palette:**
- Primary: Emerald Green (#10b981)
- Background: Light Slate (#f8fafc)
- Card Background: White (#ffffff)
- Text Primary: Slate 900 (#0f172a)
- Text Secondary: Slate 500 (#64748b)
- Success: Emerald 500 (#10b981)
- Danger: Rose 500 (#f43f5e)
- Warning: Amber 500 (#f59e0b)

**Typography:**
- Font family: Inter, Segoe UI, system-ui, sans-serif
- Headings: font-bold, tracking-tight
- Labels: text-xs, uppercase, tracking-wider
- Values: font-semibold to font-bold

**Spacing:**
- Page padding: px-4 sm:px-6 lg:px-8 py-8
- Card gap: gap-6
- Section gap: space-y-6
- Inner padding: p-6

**Effects:**
- Shadows: shadow-lg, hover:shadow-xl transitions
- Rounded corners: rounded-2xl for cards, rounded-xl for inner elements
- Transitions: transition-all duration-200

## Files to Edit

### Primary Files:
1. **src/app/(app)/vehicles/[id]/view/page.tsx** - Complete redesign
2. **src/app/(app)/vehicles/[id]/edit/page.tsx** - Apply consistent styling

### New Components (if needed):
1. **src/app/components/vehicles/VehicleHeader.tsx** - Reusable header action bar
2. **src/app/components/vehicles/VehicleStatsCard.tsx** - Primary stats display
3. **src/app/components/vehicles/VehicleSpecsCard.tsx** - Technical specs grid
4. **src/app/components/vehicles/FloatingLabelInput.tsx** - Enhanced input with floating label

## Implementation Steps

1. Create redesigned view page with new layout
2. Update edit page with consistent styling
3. Add floating label inputs for edit mode
4. Implement real-time price calculations
5. Add status badges and TukTuk icon support
6. Test responsive behavior
7. Verify all functionality works (edit, delete, image upload)

## Follow-up Steps

- Test on mobile devices
- Verify image upload functionality
- Test real-time price calculations
- Ensure delete confirmation works
- Check accessibility (keyboard navigation, screen readers)
