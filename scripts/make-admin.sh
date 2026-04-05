#!/bin/bash

# ═══════════════════════════════════════════════════
# Make User Admin Script
# Sets admin role for a Clerk user
# ═══════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Make User Admin - Setup Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f "apps/web/.env" ]; then
  echo -e "${RED}❌ .env file not found${NC}"
  echo "Please create apps/web/.env with your Clerk credentials"
  exit 1
fi

# Load environment variables
source apps/web/.env 2>/dev/null || true

# Check for Clerk Secret Key
if [ -z "$CLERK_SECRET_KEY" ]; then
  echo -e "${YELLOW}⚠️  CLERK_SECRET_KEY not found in .env${NC}"
  echo ""
  read -p "Enter your Clerk Secret Key: " CLERK_SECRET_KEY
else
  echo -e "${GREEN}✅ Found Clerk Secret Key in .env${NC}"
fi

echo ""
echo -e "${BLUE}━━━ Step 1: Get User ID ━━━${NC}"
echo ""
echo "To find your User ID:"
echo "1. Go to https://dashboard.clerk.com"
echo "2. Select your application"
echo "3. Go to 'Users' section"
echo "4. Click on your user"
echo "5. Copy the User ID (starts with 'user_')"
echo ""
read -p "Enter Clerk User ID: " USER_ID

if [ -z "$USER_ID" ]; then
  echo -e "${RED}❌ User ID is required${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━ Step 2: Setting Admin Role ━━━${NC}"
echo ""

# Make API call to Clerk
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "https://api.clerk.com/v1/users/${USER_ID}/metadata" \
  -H "Authorization: Bearer ${CLERK_SECRET_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "public_metadata": {
      "role": "admin"
    }
  }')

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Success! User is now an admin${NC}"
  echo ""
  echo -e "${BLUE}━━━ Next Steps ━━━${NC}"
  echo ""
  echo "1. Sign out of your application"
  echo "2. Sign back in"
  echo "3. Navigate to: http://localhost:3000/admin"
  echo ""
  echo -e "${GREEN}You should now have access to the admin portal!${NC}"
else
  echo -e "${RED}❌ Failed to set admin role${NC}"
  echo ""
  echo "HTTP Status: $HTTP_CODE"
  echo "Response: $BODY"
  echo ""
  echo "Common issues:"
  echo "- Invalid User ID"
  echo "- Invalid Clerk Secret Key"
  echo "- User doesn't exist"
  echo ""
  echo "Please check your credentials and try again."
  exit 1
fi

echo ""
echo -e "${BLUE}━━━ Verification ━━━${NC}"
echo ""
echo "To verify the role was set:"
echo "1. Go to Clerk Dashboard → Users → Your User"
echo "2. Check 'Public metadata' section"
echo "3. Should show: { \"role\": \"admin\" }"
echo ""
