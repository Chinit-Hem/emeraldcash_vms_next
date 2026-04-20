# E2E Test Suite TODO

## Current Progress
- [x] Analyzed codebase (login, vehicles API, schema)
- [x] Confirmed plan with repo/deploy URLs from Vercel logs
- [x] Repo: https://github.com/Chinit-Hem/emeraldcash_vms_next
- [x] Branch: blackboxai/vms-update-main-push
- [ ] BASE_URL: https://emeraldcash-vms-next-git-blackboxai-b21364-chinit-hems-projects.vercel.app (fix build first)
- [ ] PREVIEW_URL: https://emeraldcash-vms-next-mgrlgcfen-chinit-hems-projects.vercel.app

## Steps
1. ~~Understand files~~
2. Fix Vercel build failure (run `npm run build` locally, check errors)
3. Update package.json with Playwright deps/scripts
4. Create playwright.config.ts
5. Create auth.spec.ts (login /api/auth/login → /api/auth/me)
6. Create vehicles.spec.ts (GET/POST/DELETE /api/vehicles)
7. Create upload.spec.ts (/api/upload)
8. Create smoke.spec.ts (page loads)
9. Add .github/workflows/e2e.yml CI job
10. Run `npx playwright test` & generate report
11. Prioritize failures with remediations

Next: Fix build → deps.

