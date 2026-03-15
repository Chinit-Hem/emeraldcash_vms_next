# Image Display Fix - Edit Page (Complete)

## Problem
When updating a vehicle's image from the `/vehicles/[id]/edit` page, the image was not displaying in the vehicle details view page. The console showed `ERR_INVALID_URL` for `data:image/jpeg;base64,...`.

## Root Cause
The `useUpdateVehicle` hook was trying to send FormData to the API, but the API only accepts JSON and expects a Cloudinary URL. The data URL was being saved to the database instead of a proper Cloudinary URL.

## Fix Applied

### Modified: `src/app/components/vehicles/useUpdateVehicle.ts`

**Before:**
- Sent FormData with compressed image file to API
- API rejected FormData (only accepts JSON)
- Data URL was being saved to database

**After:**
1. **Upload image to Cloudinary first** (frontend-side)
2. **Get Cloudinary URL** from upload response
3. **Send JSON payload** with `image_id` set to Cloudinary URL
4. **API saves Cloudinary URL** to database
5. **View page displays image** from Cloudinary

## Code Changes

```typescript
// Step 1: Upload image to Cloudinary if provided
if (imageFile) {
  // Compress image
  const compressedResult = await compressImage(imageFile, {...});
  
  // Upload to Cloudinary
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  
  const uploadData = await uploadRes.json();
  cloudinaryImageUrl = uploadData.secure_url;
}

// Step 2: Prepare JSON payload with Cloudinary URL
const mappedData: Record<string, unknown> = {};
// ... map other fields ...

// Add the Cloudinary image URL
if (cloudinaryImageUrl) {
  mappedData.image_id = cloudinaryImageUrl;
}

const body = JSON.stringify(mappedData);
```

## Console Messages to Verify

When you save, you should see:
```
[useUpdateVehicle] Uploading image to Cloudinary...
[useUpdateVehicle] Image uploaded to Cloudinary: {url: "https://..."}
[useUpdateVehicle] Sending update to API: {hasImage: true, imageUrl: "..."}
[useUpdateVehicle] Updated vehicle received: {vehicleId: "1233", imageUrl: "..."}
[useUpdateVehicle] Cache updated with new image URL
```

## Test Again

1. Go to `/vehicles/1233/edit`
2. Upload a new image
3. Click "Save Changes"
4. You should be redirected to `/vehicles/1233/view`
5. The new image should display immediately
6. No `ERR_INVALID_URL` errors in console

## Expected Behavior

- ✅ Image uploads to Cloudinary first
- ✅ Cloudinary URL saved to database
- ✅ View page displays image from Cloudinary
- ✅ No data URLs in database
- ✅ No manual refresh needed
