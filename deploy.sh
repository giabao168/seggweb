#!/bin/bash

# Quick deployment script for cPanel
# Usage: bash deploy.sh

echo "🚀 Starting Vibe Edutainment Deployment..."

# Check if git is configured
if ! git config user.email &> /dev/null; then
    echo "⚠️  Git not configured. Setting up..."
    git config --global user.email "you@example.com"
    git config --global user.name "Your Name"
fi

# Add all changes
echo "📝 Staging files..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Production deployment - $(date +'%Y-%m-%d %H:%M:%S')" || echo "⚠️  No changes to commit"

# Push to repository
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Deployment package ready!"
echo ""
echo "📋 Next steps on your cPanel hosting:"
echo "1. Log in to cPanel"
echo "2. Open Node.js Manager"
echo "3. Click 'Create Application'"
echo "4. Configure with your app details"
echo "5. Click 'Create' and wait for it to start"
echo ""
echo "For SSH deployment, run:"
echo "  cd ~/public_html"
echo "  git clone <your-repo-url> app"
echo "  cd app"
echo "  npm install --production"
