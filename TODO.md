# Folder Structure Refactor - Progress: 0/6 ✓ Analysis Complete

## Information Gathered:
- No src/app/components/ui/ dir (no UI duplicate) 
- src/app/components/ has business components (Sidebar, Dashboard, LMS, Vehicles) → move to src/components/business/
- src/components/ui/ has design systems (neu/, glass/, liquid/) → organize to ui/design-system/
- lib/db/ nested (db-singleton.ts primary, db.ts, index.ts) → flatten to single db.ts
- Root MD files → organize to docs/ subfolders by topic
- Standard Next.js uses root components/ for UI/business components

## Updated Plan:
1. [ ] Move src/app/components/ → src/components/business/ 
2. [ ] Organize src/components/ui/design-system/ (merge neu/glass/liquid → design-system/)
3. [ ] Flatten src/lib/db/* → src/lib/db.ts (db-singleton.ts as base)
4. [ ] Move root *.md → docs/ subfolders (refactor/, deployment/, ui/)
5. [ ] Update ~100 imports (search/replace @/app/components → @/components/business)
6. [ ] npm run build, git commit/push blackboxai/refactor-structure, Vercel test

## Dependent Files to Edit:
- All files importing from '@/app/components/** (Sidebar imports show OptimizedLink etc.)
- lib/db-singleton imports 
- app/layout.tsx, pages using business components

## Followup Steps:
- npm run lint && npm run build
- git checkout -b blackboxai/refactor-structure
- git add . && git commit -m \"refactor: professional folder structure\"
- git push -u origin blackboxai/refactor-structure
- Create PR/merge to main → Vercel auto-deploy
