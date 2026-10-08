import React, { useState } from 'react';
import { Star, Send, X } from 'lucide-react';
import RatingInput from './RatingInput';

interface ReviewFormProps {
  onSubmit: (rating: number, review: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialRating?: number;
  initialReview?: string;
  title?: string;
  placeholder?: string;
  maxLength?: number;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialRating = 0,
  initialReview = '',
  title = 'Rate and Review',
  placeholder = 'Share your experience...',
  maxLength = 500,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState(initialReview);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setError(null);

    try {
      await onSubmit(rating, review.trim());
      // Success is handled by parent component (ReviewModel)
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    }
  };

  const handleCancel = () => {
    setRating(initialRating);
    setReview(initialReview);
    setError(null);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <RatingInput
            value={rating}
            onChange={setRating}
            size="lg"
            interactive={true}
            showLabel={true}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review (optional)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">
              {review.length}/{maxLength} characters
            </span>
            {rating > 0 && (
              <span className="text-xs text-emerald-600 font-medium">
                {rating} star{rating !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Send className="w-4 h-4" />
            Submit Review
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;