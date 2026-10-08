# Chat Feature Testing Guide

## Quick Setup (Step by Step)

### 1. Clear Database (if you have old data change your .env file to use a new db name like plant_care_platform_test or clear your current database *entirely*)
```bash
mongosh
use plant_care_platform_test
db.dropDatabase()
exit
```
#### ⚠️ Note: Make sure the database is completely removed.
#### Instead of clearing all data in database, we strongly recommend updating the database name in backend/app/core/config.py under the Settings class (line 13) as follows:
```
# DATABASE_NAME: str = "plant_care_platform"
DATABASE_NAME: str = "BloomNet"
```
### 2. Backend Setup
```bash
cd /Users/yuepan/Documents/OOSE/test_this.team/this.Team/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Initialize Test Data
```bash
cd /Users/yuepan/Documents/OOSE/test_this.team/this.Team/backend
source venv/bin/activate
python -m app.services.dev_seed
```

### 4. Generate Additional Test Sitters
```bash
cd /Users/yuepan/Documents/OOSE/test_this.team/this.Team/backend
source venv/bin/activate
PYTHONPATH=. python scripts/generate_test_sitters.py
```

### 5. Start Backend Server
```bash
cd /Users/yuepan/Documents/OOSE/test_this.team/this.Team/backend
source venv/bin/activate
uvicorn app.main:socket_app --reload --port 8000
```

### 6. Start Frontend Server (new terminal)
```bash
cd /Users/yuepan/Documents/OOSE/test_this.team/this.Team/frontend
npm install
npm start
```

## Test Chat Feature

### 7. Test Owner Side
1. Go to `http://localhost:3000`
2. Login with Google OAuth (e.g., `alinapanyue@gmail.com`)
3. Go to `http://localhost:3000/search`
4. Click on "Sitter Test" (first in list)
5. Click "Chat" button
6. Send a message

### 8. Test Sitter Side
1. Open new browser/incognito window
2. Go to `http://localhost:3000/sitter/login`
3. Login with `sittertest996@gmail.com; iloveoose@4ever`
4. Go to `http://localhost:3000/sitter/messages`
5. Click on conversation
6. Reply to message

## Troubleshooting

**Can't click "Sitter Test" or do chatting?** → Run step 3: `python -m app.services.dev_seed`

**404 errors?** → Check MongoDB is running and database is cleared

**Messages not appearing?** → Check backend logs for Socket.IO connection/requirement reinstall for backend 

**Wrong user names?** → Clear database and re-run all steps

## Test Accounts
- **Owner:** Use your Google account
- **Sitter:** `sittertest996@gmail.com; iloveoose@4ever`

