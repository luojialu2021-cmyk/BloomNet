#!/bin/bash

# MongoDB Atlas Migration Script
# This script safely migrates data from local MongoDB to MongoDB Atlas

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Connection strings
LOCAL_URI="mongodb://localhost:27017/plant_care_platform"
ATLAS_URI="mongodb+srv://alinapanyue_db_user:Panyue2005@cluster0.tdsxehz.mongodb.net/plant_care_platform?retryWrites=true&w=majority"

echo -e "${GREEN}=== MongoDB Atlas Migration Script ===${NC}\n"

# Step 1: Check if Atlas database is empty
echo -e "${YELLOW}Step 1: Checking Atlas database...${NC}"
ATLAS_COUNT=$(mongosh "$ATLAS_URI" --quiet --eval "db.auth_users.countDocuments()" 2>/dev/null || echo "0")
if [ "$ATLAS_COUNT" -gt 0 ]; then
    echo -e "${RED}WARNING: Atlas database already has $ATLAS_COUNT users!${NC}"
    echo -e "${YELLOW}This migration will use --drop which will DELETE existing data.${NC}"
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Migration cancelled."
        exit 1
    fi
else
    echo -e "${GREEN}Atlas database is empty. Safe to proceed.${NC}"
fi

# Step 2: Export from local database
echo -e "\n${YELLOW}Step 2: Exporting from local database...${NC}"
if [ -d "./dump" ]; then
    echo "Removing old dump directory..."
    rm -rf ./dump
fi

mongodump --uri="$LOCAL_URI" --out=./dump
echo -e "${GREEN}Export completed!${NC}"

# Step 3: Verify exported data
echo -e "\n${YELLOW}Step 3: Verifying exported data...${NC}"
COLLECTIONS=$(ls -1 ./dump/plant_care_platform/*.bson 2>/dev/null | wc -l | tr -d ' ')
echo -e "Found ${GREEN}$COLLECTIONS${NC} collections"

# Step 4: Import to Atlas (with --drop to replace existing data)
echo -e "\n${YELLOW}Step 4: Importing to Atlas...${NC}"
echo -e "${RED}WARNING: This will DROP existing collections in Atlas!${NC}"
read -p "Continue with import? (yes/no): " confirm_import
if [ "$confirm_import" != "yes" ]; then
    echo "Import cancelled."
    exit 1
fi

mongorestore --uri="$ATLAS_URI" --drop ./dump/plant_care_platform
echo -e "${GREEN}Import completed!${NC}"

# Step 5: Verify migration
echo -e "\n${YELLOW}Step 5: Verifying migration...${NC}"
LOCAL_COUNT=$(mongosh "$LOCAL_URI" --quiet --eval "db.auth_users.countDocuments()")
ATLAS_COUNT=$(mongosh "$ATLAS_URI" --quiet --eval "db.auth_users.countDocuments()")

echo -e "Local users: ${GREEN}$LOCAL_COUNT${NC}"
echo -e "Atlas users: ${GREEN}$ATLAS_COUNT${NC}"

if [ "$LOCAL_COUNT" -eq "$ATLAS_COUNT" ]; then
    echo -e "\n${GREEN}✓ Migration successful! All users migrated.${NC}"
else
    echo -e "\n${RED}✗ Migration may have issues. Counts don't match.${NC}"
    exit 1
fi

# Step 6: Check for duplicate google_id or email
echo -e "\n${YELLOW}Step 6: Checking for duplicate google_id or email...${NC}"
DUPLICATES=$(mongosh "$ATLAS_URI" --quiet --eval "
    var duplicates = [];
    db.auth_users.aggregate([
        { \$group: { _id: '\$google_id', count: { \$sum: 1 } } },
        { \$match: { count: { \$gt: 1 } } }
    ]).forEach(function(doc) {
        duplicates.push('google_id: ' + doc._id + ' (count: ' + doc.count + ')');
    });
    print(duplicates.length > 0 ? duplicates.join('\\n') : 'No duplicates found');
")

if [ -n "$DUPLICATES" ] && [ "$DUPLICATES" != "No duplicates found" ]; then
    echo -e "${RED}WARNING: Found duplicate google_id:${NC}"
    echo "$DUPLICATES"
else
    echo -e "${GREEN}✓ No duplicate google_id found.${NC}"
fi

echo -e "\n${GREEN}=== Migration Complete ===${NC}"

