# 🌱 JHU Plant Care Platform - Quick Start Guide

## ✅ Sprint 1 Completed Features

### Backend (FastAPI + MongoDB)
- **Production-ready Nearby Sitters API** - High-precision geocoding for Baltimore area
- Full REST API architecture with 30+ endpoints
- Plant care request creation and management
- **Distance-based sitter search** - Zero external dependencies
- User authentication system (stub) 
- Payment integration preparation (Stripe stub)
- File upload preparation (S3 stub)  

### Frontend (React + TypeScript)
- Responsive user interface with Tailwind CSS
- **Nearby sitter search** - Integrated with production geocoding API
- **Distance-based results** - Sitters sorted by proximity
- Booking flow pages with backend integration
- Complete API integration for all features  

---

## 🚀 Quick Start

### 1. Start the Backend

```bash
# Enter the backend directory
cd backend

# (Optional) Remove the old virtual environment if it exists
rm -rf venv

# Create a new virtual environment using Python 3.11
# Make sure you have Python 3.11 installed (brew install python@3.11)
python3.11 -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start MongoDB locally
mongod

# Start the API server
python run.py
```

✅ **Backend should now be running on `http://localhost:8000`**

### 2. Start the Frontend

```bash
# Open a new terminal and enter the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

✅ **Frontend should now be running on `http://localhost:3000`**

### 3. Create Sample Data

#### Option A: Simple Sample Data (Basic Testing)
```bash
# Create sample sitters
cd backend && python scripts/generate_test_sitters.py

# Create sample user profiles (for Explore page - users with plant interests)
cd backend && source venv/bin/activate && PYTHONPATH=. python scripts/generate_test_users.py

# Create sample listings
curl -X POST "http://localhost:8000/api/v1/listings/sample-data"
```

#### Option B: Realistic Test Data (Geographical Testing)
For testing nearby sitters functionality with real Baltimore addresses:

```bash
# Navigate to backend directory
cd backend

# Generate 100 realistic sitters with Baltimore/JHU addresses
source venv/bin/activate
PYTHONPATH=. python3 scripts/generate_test_sitters.py
```

This creates sitters with realistic locations for testing the nearby sitters API:
```bash
# Test nearby JHU sitters
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=Johns%20Hopkins%20University&page_size=5"

# Test distance filtering (within 2 miles)
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=21218&max_distance_miles=2"

# Test ZIP code search
curl "http://localhost:8000/api/v1/sitters/nearby?user_address=21218&page_size=3"
```

**📖 Detailed Guide:** See [backend/docs/TEST_DATA_GENERATION.md](./backend/docs/TEST_DATA_GENERATION.md)

### 4. Test the Application

1. **Visit:** `http://localhost:3000`
2. **Search sitters** by location or plant type
3. **Browse listings** for plant care opportunities
4. **Test the booking flow** (UI only for Sprint 1)

---

## 🔧 Troubleshooting

### Backend Issues

**MongoDB Connection Error:**
```bash
# Make sure MongoDB is running
brew services start mongodb/brew/mongodb-community
# or
sudo systemctl start mongod
```

**Python Dependencies:**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend Issues

**Node/NPM Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Port Already in Use:**
- Backend (8000): Kill process with `lsof -ti:8000 | xargs kill -9`
- Frontend (3000): Kill process with `lsof -ti:3000 | xargs kill -9`

---

## 📚 Next Steps

- Check out the **API documentation** at `http://localhost:8000/docs`
- Read the **[Backend README](./backend/README.md)** for detailed backend info
- Read the **[Frontend README](./frontend/README.md)** for detailed frontend info
- Explore the **[Project Documentation](./docs/)**

## 🎯 Development Workflow

1. **Start both servers** (backend + frontend)
2. **Create sample data** using curl commands
3. **Make changes** to code
4. **Test in browser** at `http://localhost:3000`
5. **Check API responses** at `http://localhost:8000/docs`

Happy coding! 🌱✨
