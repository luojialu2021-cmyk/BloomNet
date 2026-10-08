# 🌱 BloomNet Frontend

React.js + TypeScript frontend for the JHU Plant Care Community Platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- **Backend server running on `http://localhost:8000`** (with production geocoding)
- MongoDB with test sitter data

### Installation & Setup
```bash
# Go to frontend diectory
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx      # Navigation header
│   ├── SitterCard.tsx  # Sitter profile card
│   ├── Avatar.tsx      # User avatar component
│   └── ...
├── pages/              # Page-level components
│   ├── Landing.tsx     # Home/landing page
│   ├── Search.tsx      # Sitter search results
│   ├── SitterDetail.tsx # Individual sitter profile
│   ├── Book.tsx        # Booking/reservation page
│   └── ...
├── data/               # Mock/dummy data
│   └── sitters.ts      # Sample sitter profiles
├── App.tsx             # Main app component & routing
├── index.tsx           # React app entry point
└── index.css           # Global styles (Tailwind)
```

## 🎨 Tech Stack

- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State Management:** React hooks (useState, useEffect)
- **Build Tool:** Create React App
- **Package Manager:** npm

## 🔗 API Integration

The frontend connects to the FastAPI backend:

- **Base URL:** `http://localhost:8000/api/v1/`
- **Endpoints:**
  - `GET /sitters/` - Search sitters
  - `GET /sitters/{id}` - Get sitter details
  - `GET /listings/` - Search care listings
  - `POST /listings/sample-data` - Create sample listings data
  - Use `python scripts/generate_test_sitters.py` to create 15 test sitters

## 🚀 Available Scripts

- `npm start` - Development server (http://localhost:3000)
- `npm test` - Run test suite
- `npm run build` - Production build
- `npm run eject` - Eject from CRA (⚠️ irreversible)

## 📱 Features

### Current (Sprint 1)
- 🏠 Landing page with hero section
- 🔍 **Sitter search with production geocoding** - Nearby API integration
- 👤 Detailed sitter profiles with distance information
- 📅 Booking flow connected to backend API
- 📱 Responsive design
- 🗺️ **Distance-based sorting** - Powered by Baltimore coordinate database

### Planned (Future Sprints)
- 🔐 Google authentication
- 💳 Stripe payment integration
- 📸 Photo upload for care updates
- 💬 Messaging system
- ⭐ Rating and review system

## 🎯 Development Guidelines

### Component Structure
```tsx
import React from 'react';

interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
};
```

### Styling with Tailwind
- Use Tailwind utility classes
- Custom styles in `index.css` if needed
- Responsive design: `sm:`, `md:`, `lg:`, `xl:`

### API Calls
```tsx
const fetchSitters = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/sitters/');
    const data = await response.json();
    setSitters(data);
  } catch (error) {
    console.error('Error fetching sitters:', error);
  }
};
```

## 🐛 Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Tailwind styles not loading:**
- Check `tailwind.config.js` configuration
- Ensure `@tailwind` directives in `index.css`

**API connection issues:**
- Verify backend is running on `http://localhost:8000`
- Check CORS configuration in FastAPI

## 📚 Learn More

- [React Documentation](https://reactjs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Create React App](https://create-react-app.dev/)

## 🤝 Contributing

1. Create feature branch from `main`
2. Follow existing code style and structure
3. Add tests for new components
4. Update this README if needed
5. Submit pull request

