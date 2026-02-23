#!/usr/bin/env bash
# Firebase setup for Next.js app
# Run from app-next: bash scripts/firebase-setup.sh

set -e
cd "$(dirname "$0")/.."

echo "=== 1. Installing dependencies ==="
npm install

echo ""
echo "=== 2. Firebase login (browser will open) ==="
npx firebase login

echo ""
echo "=== 3. Link Firebase project (select your project) ==="
npx firebase use --add

echo ""
echo "=== 4. Deploy to Firebase Hosting ==="
npx firebase deploy

echo ""
echo "Done. Your app is live on Firebase Hosting."
