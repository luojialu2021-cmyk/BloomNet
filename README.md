# 🌱 JHU Plant Care Community Platform 

**BloomNet** - A secure, university-exclusive marketplace connecting plant owners with reliable caretakers within the Johns Hopkins community.
## 🌐 Easy Access
👉 [Live Demo on Render](https://this-team-1.onrender.com)

---

## ✨ Core Features


### 🔍 **Plant Sitter Discovery**

| Feature |
|---------|
| **Nearby Sitters API** - Distance-based search with precise geocoding 
| Search sitters by zip code and dates 
| View detailed sitter profiles 
| Auto-filter to show only available/active sitters 
| **Production-ready geocoding** - 50+ Baltimore area coordinates
| Advanced filtering (campus area, price range, plant type, rating) 

### 💼 **Booking & Reservations**

| Feature | 
|---------|
| Complete reservation creation and management
| Reservation status tracking (pending, confirmed, completed) 
| User-specific reservation views (owner/sitter perspectives) 
| Payment integration before booking confirmation 
| Care progress tracking and photo updates 

### ⭐ **Reviews & Ratings**

| Feature | 
|---------|
| Owners can rate and write reviews for sitters 
| Sitters receive updates when reviews are posted 
| Review system integrated with reservation workflow 

### 💬 **Real-Time Messaging**

| Feature | 
|---------|
| Real-time messaging between users 
| Chat interface embedded in the app 

### 📸 **Photo Upload**

| Feature | 
|---------|
| Upload plant photos as part of care 
| View uploaded photos in the app 

### ✅ **Plant Care Checklist**

| Feature | 
|---------|
| Plant care tasks checklist 
| Mark items as completed / in progress 

### 🧭 **Explore ( Beyond Crud )**

| Feature | 
|---------|
| Explore page to discover plants/sitters/content | ✅ | ✅ |

---

## 🚀 Tech Stack

- **Frontend:** React.js + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python) + MongoDB
- **Authentication:** Google OAuth integration ready
- **Payments:** Stripe integration (Still preparing)  
- **File Storage:** MongoDB (may move to S3 in the future)
- **Chat:** Socket.io

---

## ૮₍ •ᴗ•₎ა  Project Structure

```bash
this.Team/
├── frontend/         # React.js + TypeScript frontend
│   ├── src/         
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page-level components  
│   │   ├── data/          # Mock data
│   │   └── ...
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies
│   └── README.md         # Frontend documentation
├── backend/              # FastAPI + Python backend
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── models/       # Data models
│   │   ├── crud/         # Database operations
│   │   └── ...
│   ├── requirements.txt  # Backend dependencies
│   └── README.md         # Backend documentation
├── docs/                 # Project documentation
└── README.md             # This file
```

---

## 🚀 Quick Start

### **Option 1: Quick Setup**
See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

### **Option 2: Manual Setup**

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py  # Starts on http://localhost:8000
```

**Frontend Setup:**
```bash
cd frontend
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > .env.local
npm install
npm start  # App at http://localhost:3000
```

**Create Sample Data:**
```bash
cd backend && python scripts/generate_test_sitters.py
curl -X POST "http://localhost:8000/api/v1/listings/sample-data"
```

## 📖 Documentation

- **API Docs:** `http://localhost:8000/docs` (Swagger UI)
- **Backend:** [backend/README.md](./backend/README.md)
- **Frontend:** [frontend/README.md](./frontend/README.md)
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- **Chat Feature Testing Guide:** [Chat Feature Testing Guide](./CHAT_TEST_GUIDE.md)

---



## ('ω'✌︎ ) Screenshots
* Landing Page
<img width="1508" height="818" alt="Screenshot 2025-12-05 at 9 40 56 AM" src="https://github.com/user-attachments/assets/64c6796e-4221-4da7-83f8-a2416026e2dc" />

* Search Result Page
<img width="1512" height="820" alt="Screenshot 2025-12-05 at 9 43 46 AM" src="https://github.com/user-attachments/assets/c6b6be93-554d-4656-ad7b-c66e0dfcab15" />

<img width="1512" height="821" alt="Screenshot 2025-12-05 at 9 44 04 AM" src="https://github.com/user-attachments/assets/46cb6778-2ec7-45ca-84b6-fccd95d3f9ba" />

* Plant Sitter Detail Page
<img width="1512" height="816" alt="Screenshot 2025-12-05 at 9 44 20 AM" src="https://github.com/user-attachments/assets/8a566c07-22af-49e3-b72c-d7f6c8cf042e" />

* Sitter Portal
<img width="1510" height="821" alt="Screenshot 2025-12-05 at 9 41 32 AM" src="https://github.com/user-attachments/assets/59f986df-b943-4074-8436-547085c74503" />

* Booking Page
<img width="1512" height="822" alt="Screenshot 2025-12-05 at 9 44 57 AM" src="https://github.com/user-attachments/assets/c0d9f33b-2ead-49dd-9887-36c466c8c8a0" />

* Reservation Overview Page
<img width="1512" height="822" alt="Screenshot 2025-12-05 at 9 46 17 AM" src="https://github.com/user-attachments/assets/9d52d937-8515-41ee-b2e8-de953c9f7ab0" />

* Daily Care Task Checklist
<img width="1512" height="824" alt="Screenshot 2025-12-05 at 9 48 14 AM" src="https://github.com/user-attachments/assets/59de450b-b581-41a4-a00a-db14b2a27dd2" />

* Sitter Sign In Page
<img width="1511" height="819" alt="Screenshot 2025-12-05 at 9 41 57 AM" src="https://github.com/user-attachments/assets/519bb1df-4d46-4982-84d9-b7ff93999c8d" />

* Sitter Dashboard
<img width="1512" height="823" alt="Screenshot 2025-12-05 at 9 49 07 AM" src="https://github.com/user-attachments/assets/9784f573-3f30-46b3-be2b-a6361bff04e3" />

* Reservation Details Sitter Side
<img width="1511" height="819" alt="Screenshot 2025-12-05 at 9 49 31 AM" src="https://github.com/user-attachments/assets/058c79c1-c0ab-48a4-8dec-41e6fc7ad11b" />

* Photo Uploading Feature
<img width="1512" height="819" alt="Screenshot 2025-12-05 at 9 50 15 AM" src="https://github.com/user-attachments/assets/db913140-88d6-4d80-81be-ac7aaa1f00cc" />

* Beyond Crud : Explore Page 
<img width="1512" height="820" alt="Screenshot 2025-12-05 at 9 50 42 AM" src="https://github.com/user-attachments/assets/d8248e96-8e13-4e48-b74f-81009fb68827" />

* Real Time Chat Function
<img width="1511" height="822" alt="Screenshot 2025-12-05 at 9 51 27 AM" src="https://github.com/user-attachments/assets/1d4a5794-aea7-468c-bc7b-1138ed275e19" />
