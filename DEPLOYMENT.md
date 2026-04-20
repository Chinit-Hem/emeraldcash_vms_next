# Vercel Deployment Guide

## Option 1: Deploy via Vercel Website (Recommended for First-Time)

### Steps:
1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "Add New..." → "Project"

3. **Import your repository**
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Choose the repository "vms-next"
   - Click "Import"

4. **Configure Project**
   - Framework Preset: `Next.js` (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

5. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_API_URL` | Your Google Apps Script URL | Production, Preview, Development |
   | `SESSION_SECRET` | Your session secret | Production, Preview, Development |
   | `APPS_SCRIPT_UPLOAD_TOKEN` | Shared token for image uploads | Production, Preview, Development |
   
   **Example:**
   ```
   NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/your-script-id/exec
   SESSION_SECRET=your-long-random-secret-string
   APPS_SCRIPT_UPLOAD_TOKEN=your-shared-upload-token
   ```

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-5 minutes)
   - Your app will be live at `https://vms-next.vercel.app` (or your custom domain)

---

## Option 2: Deploy via Vercel CLI

If you prefer CLI deployment:

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```
- Opens browser for authentication
- Complete the login process

### 3. Deploy
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 4. Set Environment Variables
```bash
vercel env add NEXT_PUBLIC_API_URL
vercel env add SESSION_SECRET
vercel env add APPS_SCRIPT_UPLOAD_TOKEN
```

---

## Environment Variables Required

Make sure to set these in Vercel Dashboard:

1. **`NEXT_PUBLIC_API_URL`** (Required)
   - Your Google Apps Script web app URL
   - Get this from your Google Apps Script deployment
   - Format: `https://script.google.com/macros/s/<SCRIPT_ID>/exec`

2. **`SESSION_SECRET`** (Recommended)
   - A long random string for session security
   - Generate one: `openssl rand -base64 32`
   - Prevents users from modifying their role via cookies

3. **`APPS_SCRIPT_UPLOAD_TOKEN`** (Required for image uploads)
   - Must match the token your Apps Script expects when handling `action=uploadImage`
   - Required to upload or replace vehicle images in the UI
   - Use a strong random value and keep it private

### Optional Environment Variables

If you use custom Google Drive folders:

- `DRIVE_FOLDER_CARS`
- `DRIVE_FOLDER_MOTORCYCLES`
- `DRIVE_FOLDER_TUKTUK`

---

## After Deployment

### 1. Test Your Application
- Visit your deployed URL
- Try logging in with: `admin / 1234`
- Verify API connectivity with your Google Sheet

### 2. Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### 3. Continuous Deployment
Every push to your main branch will automatically trigger a new deployment.

---

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Ensure `NEXT_PUBLIC_API_URL` is a valid URL
- Run `npm run build` locally to debug

### API Calls Fail
- Verify CORS is enabled in your Google Apps Script
- Check that the API URL is correct in environment variables
- Review browser console for error messages

### Session Issues
- Make sure `SESSION_SECRET` is set and consistent
- Clear browser cookies and try again

---

## Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

