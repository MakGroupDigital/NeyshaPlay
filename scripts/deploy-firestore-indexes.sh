#!/bin/bash

# Script to deploy Firestore indexes
# This will create the necessary composite indexes for queries

echo "🔥 Deploying Firestore indexes..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Deploy indexes
echo "📤 Deploying indexes to Firestore..."
firebase deploy --only firestore:indexes

echo ""
echo "✅ Indexes deployed successfully!"
echo ""
echo "📝 Note: Index creation can take a few minutes."
echo "   You can check the status in the Firebase Console:"
echo "   https://console.firebase.google.com/project/studio-4725166594-b0358/firestore/indexes"
echo ""
