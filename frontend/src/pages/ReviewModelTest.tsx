import React, { useState } from 'react';
import ReviewModel from '../components/ReviewModel';

const ReviewModelTest: React.FC = () => {
  const [showOwnerModel, setShowOwnerModel] = useState(false);
  const [showSitterModel, setShowSitterModel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState<Array<{ type: string; rating: number; review: string; timestamp: string }>>([]);

  const handleOwnerSubmit = async (rating: number, review: string) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmittedReviews(prev => [{ type: 'Owner Rating', rating, review, timestamp: new Date().toLocaleString() }, ...prev]);
    setIsSubmitting(false);
    setShowOwnerModel(false);
  };

  const handleSitterSubmit = async (rating: number, review: string) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmittedReviews(prev => [{ type: 'Sitter Rating', rating, review, timestamp: new Date().toLocaleString() }, ...prev]);
    setIsSubmitting(false);
    setShowSitterModel(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900">Review Model Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">What to Test</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Click "Test Owner Rating" to open the owner rating Model</li>
          <li>• Click "Test Sitter Rating" to open the sitter rating Model</li>
          <li>• Submit a rating to see the success animation</li>
          <li>• Check the submitted reviews section to see your submissions</li>
        </ul>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setShowOwnerModel(true)}
          className="px-6 py-3 font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
        >
          Test Owner Rating
        </button>
        <button
          onClick={() => setShowSitterModel(true)}
          className="px-6 py-3 font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700"
        >
          Test Sitter Rating
        </button>
      </div>

      {submittedReviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Submitted Reviews</h2>
          <div className="space-y-4">
            {submittedReviews.map((review, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={`text-lg ${
                          i < review.rating ? 'text-amber-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    review.type === 'Owner Rating' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {review.type}
                  </span>
                  <span className="text-sm text-gray-500">{review.timestamp}</span>
                </div>
                <p className="text-gray-700">{review.review}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReviewModel
        isOpen={showOwnerModel}
        onClose={() => setShowOwnerModel(false)}
        onSubmit={handleOwnerSubmit}
        reservationId="test-1"
        sitterName="Alex Green"
        ownerName="Sarah Johnson"
        startDate="2024-01-15"
        endDate="2024-01-20"
        isOwnerRating={true}
        isSubmitting={isSubmitting}
      />

      <ReviewModel
        isOpen={showSitterModel}
        onClose={() => setShowSitterModel(false)}
        onSubmit={handleSitterSubmit}
        reservationId="test-2"
        sitterName="Alex Green"
        ownerName="Sarah Johnson"
        startDate="2024-01-15"
        endDate="2024-01-20"
        isOwnerRating={false}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default ReviewModelTest;

