# Deploy Fix TODO

## 1. [ ] Fix Dependencies
- Add shadcn-ui deps to package.json
- npm install

## 2. [ ] Fix Syntax Errors
- src/app/api/sms/assets/[id]/route.ts
- src/app/cleaned-vehicles/page.tsx

## 3. [ ] Fix TypeScript Errors
- src/app/api/sms/history/[assetId]/route.ts (async params)

## 4. [ ] Test Build
- npm run lint
- npm run build

## 5. [ ] Git Sync & Push
- git pull --rebase origin main
- git push origin main

## 6. [ ] Verify Deploy
- Check Vercel/Render dashboard

