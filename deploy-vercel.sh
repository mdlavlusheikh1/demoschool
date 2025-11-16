#!/bin/bash

# Vercel Deployment Script
# This script automates the Vercel deployment process

echo "🚀 Vercel Deployment Script"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${BLUE}📋 Step 1: Checking Prerequisites${NC}"
echo "──────────────────────────────────────"

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git: Installed${NC}"
echo -e "${GREEN}✅ Node.js: Installed${NC}"
echo -e "${GREEN}✅ npm: Installed${NC}"

# Step 2: Check Vercel CLI
echo ""
echo -e "${BLUE}📋 Step 2: Checking Vercel CLI${NC}"
echo "──────────────────────────────────────"

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI is not installed${NC}"
    echo -e "${CYAN}📦 Installing Vercel CLI...${NC}"
    npm install -g vercel
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Vercel CLI${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Vercel CLI: Installed${NC}"
fi

# Step 3: Check Git status
echo ""
echo -e "${BLUE}📋 Step 3: Checking Git Repository${NC}"
echo "──────────────────────────────────────"

if [ -d ".git" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
        read -p "❓ Do you want to commit and push changes? (y/n): " answer
        
        if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
            echo -e "${CYAN}📝 Staging changes...${NC}"
            git add .
            
            echo -e "${CYAN}💾 Committing changes...${NC}"
            git commit -m "Deploy to Vercel"
            
            echo -e "${CYAN}📤 Pushing to remote...${NC}"
            git push
        fi
    else
        echo -e "${GREEN}✅ Git repository is clean${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Not a Git repository${NC}"
    echo -e "${CYAN}💡 Initialize Git and push to GitHub first${NC}"
    exit 1
fi

# Step 4: Environment variables check
echo ""
echo -e "${BLUE}📋 Step 4: Environment Variables Check${NC}"
echo "──────────────────────────────────────"

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ Found .env.local file${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local file not found${NC}"
fi

echo -e "${CYAN}💡 Make sure to add environment variables to Vercel Dashboard:${NC}"
echo -e "${YELLOW}   Project Settings → Environment Variables${NC}"
echo ""
echo -e "${CYAN}📋 Required Environment Variables:${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_FIREBASE_API_KEY${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_FIREBASE_PROJECT_ID${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_FIREBASE_APP_ID${NC}"
echo -e "${YELLOW}   - FIREBASE_ADMIN_PROJECT_ID${NC}"
echo -e "${YELLOW}   - FIREBASE_ADMIN_PRIVATE_KEY${NC}"
echo -e "${YELLOW}   - FIREBASE_ADMIN_CLIENT_EMAIL${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_SCHOOL_ID${NC}"
echo -e "${YELLOW}   - NEXT_PUBLIC_SCHOOL_NAME${NC}"
echo ""
echo -e "${CYAN}📄 See VERCEL_ENV_VARIABLES.md for complete list${NC}"

# Step 5: Build project
echo ""
echo -e "${BLUE}📋 Step 5: Building Project${NC}"
echo "──────────────────────────────────────"

echo -e "${CYAN}🔨 Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Step 6: Deploy to Vercel
echo ""
echo -e "${BLUE}📋 Step 6: Deploying to Vercel${NC}"
echo "──────────────────────────────────────"

echo -e "${CYAN}💡 Choose deployment method:${NC}"
echo -e "${YELLOW}   1. Deploy to preview (vercel)${NC}"
echo -e "${YELLOW}   2. Deploy to production (vercel --prod)${NC}"
echo -e "${YELLOW}   3. Skip (deploy manually from Vercel Dashboard)${NC}"

read -p "❓ Enter choice (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo -e "${CYAN}🚀 Deploying to preview...${NC}"
        vercel
        ;;
    2)
        echo ""
        echo -e "${CYAN}🚀 Deploying to production...${NC}"
        vercel --prod
        ;;
    3)
        echo ""
        echo -e "${CYAN}📋 Manual Deployment Steps:${NC}"
        echo -e "${YELLOW}   1. Go to https://vercel.com/dashboard${NC}"
        echo -e "${YELLOW}   2. Click 'Add New...' → 'Project'${NC}"
        echo -e "${YELLOW}   3. Import your GitHub repository${NC}"
        echo -e "${YELLOW}   4. Add environment variables${NC}"
        echo -e "${YELLOW}   5. Click 'Deploy'${NC}"
        echo ""
        echo -e "${CYAN}📄 See DEPLOY_VERCEL.md for detailed guide${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment process completed!${NC}"
echo -e "${GREEN}🎉 Check your Vercel dashboard for deployment status${NC}"

