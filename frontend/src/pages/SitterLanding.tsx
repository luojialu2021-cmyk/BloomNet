import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from "lucide-react";
import { useSitterAuth } from '../contexts/AuthContext';

export default function SitterLanding() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useSitterAuth();

  // Redirect to dashboard if already logged in as sitter
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/sitter/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 border-4 rounded-full border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authenticated, don't render anything (will redirect)
  if (isAuthenticated) {
    return null;
  }

  const handleGetStarted = () => {
    navigate('/sitter/login');
  };

  const handleLogin = () => {
    navigate('/sitter/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b shadow-sm backdrop-blur bg-white/80">
        <div className="flex items-center justify-between max-w-6xl px-4 py-3 mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-amber-600"/>
            <span className="text-xl font-bold text-gray-900">BloomNet</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full">
              SITTER
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <button
              onClick={handleLogin}
              className="font-medium text-gray-700 transition-colors hover:text-amber-600"
            >
              Sign In
            </button>
            <button
              onClick={handleGetStarted}
              className="px-4 py-2 font-semibold text-white transition-all shadow-lg rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:shadow-xl"
            >
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
              Become a Plant Care
              <span className="text-transparent bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text"> Expert</span>
            </h1>
            <p className="max-w-3xl mx-auto mb-8 text-xl text-gray-600">
              Join the JHU Plant Care Community and help fellow students, faculty, and staff 
              keep their plants healthy while earning money doing what you love.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 text-lg font-semibold text-white transition-colors rounded-lg bg-amber-600 hover:bg-amber-700"
              >
                Start Earning Today
              </button>
              <button className="px-8 py-4 text-lg font-semibold transition-colors border-2 rounded-lg text-amber-600 border-amber-600 hover:bg-amber-50">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Why Join as a Plant Sitter?
            </h2>
            <p className="text-lg text-gray-600">
              Flexible work, good pay, and help your community
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-6 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Earn Money</h3>
              <p className="text-gray-600">
                Set your own rates and earn $15-50+ per visit. Perfect for students looking for flexible income.
              </p>
            </div>
            
            <div className="p-6 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Flexible Schedule</h3>
              <p className="text-gray-600">
                Work when you want. Set your availability and only accept jobs that fit your schedule.
              </p>
            </div>
            
            <div className="p-6 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100">
                <span className="text-2xl">🌱</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Help Community</h3>
              <p className="text-gray-600">
                Make a difference by helping fellow JHU community members keep their plants healthy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get started in just a few simple steps
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-xl font-bold text-white rounded-full bg-amber-600">
                1
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Sign Up</h3>
              <p className="text-gray-600">
                Create your account with your JHU email and complete your profile.
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-xl font-bold text-white rounded-full bg-amber-600">
                2
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Set Your Schedule</h3>
              <p className="text-gray-600">
                Tell us when you're available and what areas you can serve.
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-xl font-bold text-white rounded-full bg-amber-600">
                3
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Get Matched</h3>
              <p className="text-gray-600">
                Receive requests from plant owners in your area and accept the ones you want.
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-xl font-bold text-white rounded-full bg-amber-600">
                4
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Earn & Grow</h3>
              <p className="text-gray-600">
                Provide excellent care, get paid, and build your reputation in the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="py-16 bg-white">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Requirements
            </h2>
            <p className="text-lg text-gray-600">
              What you need to get started
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center justify-center w-6 h-6 mt-1 mr-3 rounded-full bg-amber-100">
                  <span className="text-sm text-amber-600">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">JHU Community Member</h3>
                  <p className="text-gray-600">Current student, faculty, or staff with valid JHU email</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center justify-center w-6 h-6 mt-1 mr-3 rounded-full bg-amber-100">
                  <span className="text-sm text-amber-600">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Plant Care Experience</h3>
                  <p className="text-gray-600">Basic knowledge of plant care (we provide training resources)</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center justify-center w-6 h-6 mt-1 mr-3 rounded-full bg-amber-100">
                  <span className="text-sm text-amber-600">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Reliable Transportation</h3>
                  <p className="text-gray-600">Ability to travel to plant locations within your service area</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center justify-center w-6 h-6 mt-1 mr-3 rounded-full bg-amber-100">
                  <span className="text-sm text-amber-600">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Smartphone</h3>
                  <p className="text-gray-600">For communication, photo updates, and GPS navigation</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center justify-center w-6 h-6 mt-1 mr-3 rounded-full bg-amber-100">
                  <span className="text-sm text-amber-600">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Responsible & Trustworthy</h3>
                  <p className="text-gray-600">Commitment to providing excellent care and following instructions</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center justify-center w-6 h-6 mt-1 mr-3 rounded-full bg-amber-100">
                  <span className="text-sm text-amber-600">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Good Communication</h3>
                  <p className="text-gray-600">Ability to communicate clearly with plant owners</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-amber-600">
        <div className="px-4 mx-auto text-center max-w-7xl sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to Start Your Plant Care Journey?
          </h2>
          <p className="mb-8 text-xl text-amber-100">
            Join hundreds of JHU community members who are already earning money as plant sitters.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 text-lg font-semibold transition-colors bg-white rounded-lg text-amber-600 hover:bg-gray-100"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-white bg-gray-900">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="mb-4 text-2xl font-bold">🌱 BloomNet</h3>
            <p className="mb-4 text-gray-400">
              Connecting the JHU community through plant care
            </p>
            <div className="flex justify-center space-x-6">
              <button className="text-gray-400 hover:text-white">Privacy Policy</button>
              <button className="text-gray-400 hover:text-white">Terms of Service</button>
              <button className="text-gray-400 hover:text-white">Contact Us</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
