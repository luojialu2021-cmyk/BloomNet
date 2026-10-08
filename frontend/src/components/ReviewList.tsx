import React, { useState } from 'react';
import { Star, Calendar, User } from 'lucide-react';
import RatingInput from './RatingInput';
import Avatar from './Avatar';

export interface Review {
  id: string;
  rating: number;
  review?: string;
  reviewer_name: string;
  reviewer_id: string;
  created_at: string;
  is_owner_review?: boolean;
  is_sitter_review?: boolean;
  isRated?: boolean; // Track if the review is rated
}

interface ReviewListProps {
  reviews: Review[];
  title?: string;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  maxHeight?: string;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews: initialReviews,
  title = 'Reviews',
  showEmptyState = true,
  emptyStateMessage = 'No reviews yet',
  maxHeight = 'max-h-96'
}) => {
  const [reviews, setReviews] = useState(initialReviews); // Manage reviews state
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleRate = (id: string) => {
    console.log('handleRate called for review ID:', id); // Debugging log
    setReviews((prevReviews) => {
      const updatedReviews = prevReviews.map((review) =>
        review.id === id ? { ...review, isRated: true } : review
      );
      console.log('Updated reviews state:', updatedReviews); // Debugging log
      return updatedReviews;
    });
  };

  if (reviews.length === 0) {
    if (!showEmptyState) return null;
    
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">{emptyStateMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {title} ({reviews.length})
      </h3>
      
      <div className={`space-y-4 overflow-y-auto ${maxHeight}`}>
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Avatar name={review.reviewer_name} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {review.reviewer_name}
                  </span>
                  {review.is_owner_review && (
                    <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                      Owner
                    </span>
                  )}
                  {review.is_sitter_review && (
                    <span className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                      Sitter
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <RatingInput
                    value={review.rating}
                    onChange={() => {}} // Read-only
                    size="sm"
                    interactive={false}
                  />
                  <span className="text-sm font-medium text-gray-800">{review.rating}.0</span>
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(review.created_at)}
                  </span>
                </div>
                
                {review.review && (
                  <p className="text-gray-700 leading-relaxed">
                    {review.review}
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={() => handleRate(review.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                review.isRated ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {review.isRated ? 'Rated' : 'Rate Owner'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewList;