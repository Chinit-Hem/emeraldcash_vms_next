# Apps Script deployment

## Fix "Unknown action: uploadImage"

Your API returns `status`, `meta`, `data` → you use **Code.snake.gs**. The script that runs must have `uploadImage` in `doPost`.

1. **Use only ONE main script**  
   In your Google Apps Script project, use **either** `Code.gs` **or** `Code.snake.gs`, not both.  
   If both exist, only one `doPost` runs (the other is ignored) and you may get "Unknown action: uploadImage".  
   **Do this:** Delete or rename the other file (e.g. rename `Code.gs` to `Code.gs.bak`) so only one file defines `doPost`.

2. **Copy the full file from this repo**  
   - If your sheet has headers like `id`, `category`, `image_id` → copy **all** of **Code.snake.gs** into the file that has `doPost`.  
   - If your sheet has `#`, Image, Category, Brand… → copy **all** of **Code.gs** into that file.  
   Replace the entire file content, save, then deploy (step 4).

3. **Optional files** (do not define `doPost`)  
   You can add: `uploadImage.gs`, `deleteVehicleWithImage.gs`.  
   Do **not** add a second main script (e.g. do not add both Code.gs and Code.snake.gs).

4. **Redeploy**  
   Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.  
   Use **Execute as: Me** and **Who has access: Anyone** so the app can upload to Drive.

5. **URL**  
   Set `NEXT_PUBLIC_API_URL` in `.env.local` to the **exact** Web app URL (ends with `/exec`).
