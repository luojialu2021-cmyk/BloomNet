#!/bin/bash

# Database cleanup script
# Location: backend/testing/scripts/cleanup_database.sh
# Purpose: Remove duplicate data and reset database to clean state

DATABASE_NAME="plant_care_platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🧹 JHU Plant Care Platform - Database Cleanup"
echo "============================================="
echo "Timestamp: $(date)"
echo "Database: $DATABASE_NAME"
echo ""

# Function to execute MongoDB commands
run_mongo_command() {
    local command="$1"
    local description="$2"
    
    echo "🔧 $description"
    echo "Command: $command"
    echo "--------------------"
    
    mongosh "$DATABASE_NAME" --eval "$command"
    
    if [ $? -eq 0 ]; then
        echo "✅ Success"
    else
        echo "❌ Failed"
    fi
    echo ""
}

# Backup current data (optional)
echo "💾 Creating backup before cleanup..."
run_mongo_command "
db.listings.find().forEach(function(doc) {
    db.listings_backup_$TIMESTAMP.insertOne(doc);
});
print('Backup created: listings_backup_$TIMESTAMP');
" "Creating backup of listings"

# Show current state
run_mongo_command "
print('Current state:');
print('Listings count:', db.listings.countDocuments());
print('Sitters count:', db.sitters.countDocuments());
" "Checking current database state"

# Remove duplicate listings (keep only one)
echo "🗑️  Removing duplicate listings..."
run_mongo_command "
var duplicates = db.listings.aggregate([
    { \$group: { 
        _id: { title: '\$title', owner_id: '\$owner_id', description: '\$description' }, 
        docs: { \$push: '\$_id' }, 
        count: { \$sum: 1 } 
    }},
    { \$match: { count: { \$gt: 1 } } }
]).toArray();

var deletedCount = 0;
duplicates.forEach(function(duplicate) {
    // Keep the first one, delete the rest
    var docsToDelete = duplicate.docs.slice(1);
    docsToDelete.forEach(function(docId) {
        db.listings.deleteOne({ _id: docId });
        deletedCount++;
    });
});

print('Deleted', deletedCount, 'duplicate listings');
" "Removing duplicate listings"

# Clean up any invalid or incomplete records
echo "🧼 Cleaning up invalid records..."
run_mongo_command "
var invalidCount = db.listings.deleteMany({
    \$or: [
        { title: { \$exists: false } },
        { title: '' },
        { owner_id: { \$exists: false } },
        { plants: { \$size: 0 } }
    ]
}).deletedCount;

print('Deleted', invalidCount, 'invalid listings');
" "Removing invalid listings"

# Show final state
run_mongo_command "
print('Final state:');
print('Listings count:', db.listings.countDocuments());
print('Sitters count:', db.sitters.countDocuments());

print('\\nRemaining listings:');
db.listings.find({}, {title: 1, owner_id: 1}).forEach(function(doc) {
    print('- ID:', doc._id, 'Title:', doc.title);
});
" "Checking final database state"

# Optional: Reset to completely clean state
read -p "🤔 Do you want to completely reset the database? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Resetting database to clean state..."
    
    run_mongo_command "
    db.listings.deleteMany({});
    db.sitters.deleteMany({});
    print('Database reset complete');
    " "Resetting database to clean state"
    
    echo "✨ Database is now clean. You can create fresh sample data by running:"
    echo "   curl -X POST 'http://localhost:8000/api/v1/listings/sample-data'"
    echo "   cd backend && python scripts/generate_test_sitters.py"
fi

echo ""
echo "🎉 Database cleanup completed!"
echo "Backup available as: listings_backup_$TIMESTAMP"