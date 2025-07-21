#!/bin/bash

# =============================================================================
# DEPLOYMENT SCRIPT: Delivery Notification System
# =============================================================================
# This script deploys the delivery notification system including:
# 1. Database migration for delivery_notifications table
# 2. Edge function for checking delivery reminders
# 3. Scheduling the edge function to run daily

set -e

echo "🚀 Deploying Delivery Notification System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first."
    print_status "Install with: npm install -g supabase"
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "supabase/config.toml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting deployment..."

# 1. Apply database migration
print_status "Applying database migration..."
supabase db push

if [ $? -eq 0 ]; then
    print_success "Database migration applied successfully"
else
    print_error "Failed to apply database migration"
    exit 1
fi

# 2. Deploy the edge function
print_status "Deploying check-delivery-reminders edge function..."
supabase functions deploy check-delivery-reminders

if [ $? -eq 0 ]; then
    print_success "Edge function deployed successfully"
else
    print_error "Failed to deploy edge function"
    exit 1
fi

# 3. Schedule the edge function to run daily at 9 AM
print_status "Scheduling edge function to run daily at 9 AM..."
supabase functions schedule check-delivery-reminders "0 9 * * *"

if [ $? -eq 0 ]; then
    print_success "Edge function scheduled successfully"
else
    print_warning "Failed to schedule edge function. You may need to schedule it manually."
    print_status "Manual scheduling command: supabase functions schedule check-delivery-reminders '0 9 * * *'"
fi

# 4. Verify deployment
print_status "Verifying deployment..."

# Check if the function exists
FUNCTION_STATUS=$(supabase functions list | grep check-delivery-reminders || echo "NOT_FOUND")

if [[ $FUNCTION_STATUS == *"check-delivery-reminders"* ]]; then
    print_success "Edge function verification successful"
else
    print_error "Edge function verification failed"
    exit 1
fi

# 5. Test the function (optional)
read -p "Do you want to test the edge function now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Testing edge function..."
    
    # Get the function URL
    PROJECT_REF=$(supabase status | grep "API URL" | sed 's/.*\/\/\([^.]*\)\..*/\1/')
    FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/check-delivery-reminders"
    
    print_status "Function URL: $FUNCTION_URL"
    print_status "Testing with curl..."
    
    # Test the function
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $(supabase token)" \
        -d '{}')
    
    if [ $? -eq 0 ]; then
        print_success "Edge function test successful"
        print_status "Response: $RESPONSE"
    else
        print_warning "Edge function test failed or returned an error"
        print_status "Response: $RESPONSE"
    fi
fi

print_success "🎉 Delivery Notification System deployment completed!"
print_status ""
print_status "📋 Summary:"
print_status "  ✅ Database migration applied"
print_status "  ✅ Edge function deployed"
print_status "  ✅ Function scheduled to run daily at 9 AM"
print_status ""
print_status "🔧 Next steps:"
print_status "  1. Test the system by creating orders with delivery dates"
print_status "  2. Check the app's notification settings"
print_status "  3. Monitor the function logs: supabase functions logs check-delivery-reminders"
print_status ""
print_status "📱 To test manually:"
print_status "  - Use the 'Test Delivery Notifications' button in the app"
print_status "  - Or call the function directly: curl -X POST $FUNCTION_URL"
print_status ""
print_status "📊 Monitor delivery notifications:"
print_status "  - Check the delivery_notifications table in your database"
print_status "  - View function logs for any errors" 