import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import SearchResults from "./pages/SearchResults";
import SitterDetail from "./pages/SitterDetail";
import Book from "./pages/Book";
import ChatWithSitter from "./pages/ChatWithSitter";
// Reservation pages
import ReservationsPage from "./pages/Reservations";
import ReservationDetailPage from "./pages/ReservationDetail";
import ReservationOwnerOverviewPage from "./pages/ReservationOwnerOverview";
import ReservationTaskPlannerPage from "./pages/ReservationTaskPlanner";
import ReservationConfirmationPage from "./pages/ReservationConfirmation";
import ReservationTasksPage from "./pages/ReservationTasks";
import Explore from "./pages/Explore";
// User portal pages
import UserLogin from "./pages/User/Login";
import UserRegister from "./pages/User/Register";
import UserDashboard from "./pages/User/Dashboard";
// Sitter portal pages
import SitterProfileNew from "./pages/Sitter/ProfileNew";
import SitterMessages from "./pages/Sitter/Messages";
import SitterAvailability from "./pages/Sitter/Availability";
import SitterLogin from "./pages/Sitter/Login";
import SitterRegisterNew from "./pages/Sitter/Register";
import SitterLanding from "./pages/SitterLanding";
import SitterDashboardNew from "./pages/SitterDashboard";
// Test Rating pages
import RatingTest from "./pages/RatingTest";
import ReviewFormTest from "./pages/ReviewFormTest";
import ReviewListTest from "./pages/ReviewListTest";
import ReviewModelTest from "./pages/ReviewModelTest";
import SitterCardTest from "./pages/SitterCardTest";
import ReservationsTest from "./pages/ReservationsTest";

// You need to get this from Google Cloud Console
// For now, we'll use a placeholder - it will be fetched from the backend
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

// Component to conditionally render header
function AppContent() {
  const location = useLocation();
  
  // List of routes that should NOT show user header
  const noHeaderRoutes = [
    '/sitter-portal',
    '/sitter/register',
    '/sitter/login',
    '/sitter/dashboard',
    '/sitter/messages',
    '/sitter/availability',
    '/sitter/profile',
    '/login',
    '/register',
    '/dashboard'
  ];
  
  // Check if current route should hide header
  const shouldHideHeader = noHeaderRoutes.some(route => 
    location.pathname.startsWith(route)
  );
  
  // Only show header when not on special routes
  const shouldShowHeader = !shouldHideHeader;

  return (
    <>
      {shouldShowHeader && <Header/>}
      <Routes>
        {/* Customer routes */}
        <Route path="/" element={<Landing/>}/>
        <Route path="/search" element={<SearchResults/>}/>
        <Route path="/explore" element={<Explore/>}/>
        <Route path="/sitter/:id" element={<SitterDetail/>}/>
        <Route path="/book/:id" element={<Book/>}/>
        <Route path="/chat/:sitterId" element={<ChatWithSitter/>}/>

        {/* Test routes */}
        <Route path="/test-rating" element={<RatingTest/>}/>
        <Route path="/test-review-form" element={<ReviewFormTest/>}/>
        <Route path="/test-review-list" element={<ReviewListTest/>}/>
        <Route path="/test-review-Model" element={<ReviewModelTest/>}/>
        <Route path="/test-sitter-card" element={<SitterCardTest/>}/>
        <Route path="/test-reservations" element={<ReservationsTest/>}/>
        
        {/* User portal routes */}
        <Route path="/login" element={<UserLogin/>}/>
        <Route path="/register" element={<UserRegister/>}/>
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="user">
            <UserDashboard/>
          </ProtectedRoute>
        }/>
        
        {/* Reservation routes - Owner only */}
        <Route path="/reservations" element={
          <ProtectedRoute requiredRole="user">
            <ReservationsPage />
          </ProtectedRoute>
        } />
        <Route path="/reservations/:id" element={
          <ProtectedRoute requiredRole="user">
            <ReservationOwnerOverviewPage />
          </ProtectedRoute>
        } />
        <Route path="/reservations/:id/planner" element={
          <ProtectedRoute requiredRole="user">
            <ReservationTaskPlannerPage />
          </ProtectedRoute>
        } />
        <Route path="/reservations/:id/tasks" element={
          <ProtectedRoute requiredRole="user">
            <ReservationTasksPage />
          </ProtectedRoute>
        } />
        <Route path="/reservations/:id/detail" element={
          <ProtectedRoute>
            <ReservationDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/reservation-confirmation/:id" element={
          <ProtectedRoute requiredRole="user">
            <ReservationConfirmationPage />
          </ProtectedRoute>
        } />
        
        {/* Sitter portal routes */}
        <Route path="/sitter-portal" element={<SitterLanding/>}/>
        <Route path="/sitter/register" element={<SitterRegisterNew/>}/>
        <Route path="/sitter/login" element={<SitterLogin/>}/>
        <Route path="/sitter/dashboard" element={
          <ProtectedRoute requiredRole="sitter">
            <SitterDashboardNew/>
          </ProtectedRoute>
        }/>
        <Route path="/sitter/messages" element={
          <ProtectedRoute requiredRole="sitter">
            <SitterMessages/>
          </ProtectedRoute>
        }/>
        <Route path="/sitter/availability" element={
          <ProtectedRoute requiredRole="sitter">
            <SitterAvailability/>
          </ProtectedRoute>
        }/>
        <Route path="/sitter/profile" element={
          <ProtectedRoute requiredRole="sitter">
            <SitterProfileNew />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <ChatProvider>
          <BrowserRouter>
            <AppContent/>
          </BrowserRouter>
        </ChatProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}