import React, { useState } from 'react';
import ReviewForm from '../components/ReviewForm';

const ReviewFormTest: React.FC = () => {
  const [submittedReviews, setSubmittedReviews] = useState<Array<{ rating: number; review: string; timestamp: string }>>([]);
  const [isSubmitting1, setIsSubmitting1] = useState(false);
  const [isSubmitting2, setIsSubmitting2] = useState(false);

  const handleSubmit1 = async (rating: number, review: string) => {
    setIsSubmitting1(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmittedReviews(prev => [{ rating, review, timestamp: new Date().toLocaleString() }, ...prev]);
    setIsSubmitting1(false);
  };

  const handleSubmit2 = async (rating: number, review: string) => {
    setIsSubmitting2(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmittedReviews(prev => [{ rating, review, timestamp: new Date().toLocaleString() }, ...prev]);
    setIsSubmitting2(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900">Review Form Test</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">With Cancel Button</h2>
          <ReviewForm
            onSubmit={handleSubmit1}
            isSubmitting={isSubmitting1}
            title="Leave a Review"
            placeholder="Share your experience..."
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Without Cancel</h2>
          <ReviewForm
            onSubmit={handleSubmit2}
            isSubmitting={isSubmitting2}
            title="Submit Rating"
            placeholder="How was your experience?"
          />
        </div>
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
                  <span className="text-sm text-gray-500">{review.timestamp}</span>
                </div>
                <p className="text-gray-700">{review.review}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewFormTest;

