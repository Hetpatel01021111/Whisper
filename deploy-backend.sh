#!/bin/bash

echo "🚀 Deploying Backend to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "📝 Please login to Railway..."
railway login

# Initialize project (if not already)
if [ ! -f "railway.json" ]; then
    echo "🔧 Initializing Railway project..."
    railway init
fi

# Link to project or create new one
echo "🔗 Linking to Railway project..."
railway link

# Set environment variables
echo "⚙️  Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Deploy
echo "🚀 Deploying..."
railway up

# Get the URL
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your backend URL: railway domain"
echo "2. Update web-app/src/socket.js with the URL"
echo "3. Rebuild frontend: cd web-app && npm run build"
echo "4. Redeploy to Vercel: vercel --prod"
echo ""
