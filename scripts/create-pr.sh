#!/bin/bash

# Script to create a pull request for Vercel deployment changes
# Run this script AFTER completing GitHub authentication (gh auth login)

echo "🚀 Starting Pull Request creation for Vercel deployment..."

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub authentication required. Run 'gh auth login' first."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")/.." || exit 1

echo "📦 Staging deployment files..."
git add vercel.json DEPLOYMENT.md

echo "📝 Creating commit..."
git commit -m "feat: Add Vercel deployment configuration

- Add vercel.json with build settings and security headers
- Add DEPLOYMENT.md with comprehensive deployment guide
- Configure environment variables for production"

echo "🌿 Creating and pushing branch..."
git checkout -b blackboxai/vercel-deployment
git push -u origin blackboxai/vercel-deployment

echo "🔀 Creating pull request..."
gh pr create \
    --title "feat: Add Vercel deployment configuration" \
    --body "## Summary
This PR adds Vercel deployment configuration for the VMS Next.js project.

## Changes
- **vercel.json**: Vercel configuration with:
  - Build command: \`npm run build\`
  - Framework: Next.js 16
  - Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
  - Environment variable references

- **DEPLOYMENT.md**: Comprehensive deployment guide with:
  - Option 1: Vercel Dashboard deployment steps
  - Option 2: Vercel CLI deployment steps
  - Environment variables configuration
  - Troubleshooting guide

## Environment Variables Required
- \`NEXT_PUBLIC_API_URL\` - Google Apps Script URL
- \`SESSION_SECRET\` - Session security secret

## Testing
Deploy to Vercel and verify:
- [ ] Build completes successfully
- [ ] Application loads without errors
- [ ] API calls work correctly
- [ ] Login functionality works

## Notes
This enables continuous deployment from the main branch to Vercel."

echo "✅ Pull request created successfully!"
echo "📋 View your PR: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/pulls"

