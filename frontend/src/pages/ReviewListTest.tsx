import React from 'react';
import ReviewList from '../components/ReviewList';
import type { Review } from '../api/types';

const ReviewListTest: React.FC = () => {
  const ownerReviews: Review[] = [
    {
      id: '1',
      rating: 5,
      review: 'Amazing sitter! My plants were so well taken care of.',
      reviewer_name: 'Sarah Johnson',
      reviewer_id: 'user1',
      created_at: '2024-01-15T10:30:00Z',
      is_owner_review: true,
    },
    {
      id: '2',
      rating: 4,
      review: 'Great communication and very reliable.',
      reviewer_name: 'Mike Chen',
      reviewer_id: 'user2',
      created_at: '2024-01-10T14:20:00Z',
      is_owner_review: true,
    },
  ];

  const sitterReviews: Review[] = [
    {
      id: '3',
      rating: 5,
      review: 'Sarah was a great client with clear instructions.',
      reviewer_name: 'Alex Green',
      reviewer_id: 'sitter1',
      created_at: '2024-01-15T11:00:00Z',
      is_sitter_review: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900">Review List Test</h1>
      
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Owner Reviews</h2>
        <ReviewList
          reviews={ownerReviews}
          title="Customer Reviews"
          maxHeight="max-h-80"
          showEmptyState={false}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sitter Reviews</h2>
        <ReviewList
          reviews={sitterReviews}
          title="Sitter Reviews"
          maxHeight="max-h-80"
          showEmptyState={false}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Empty State</h2>
        <ReviewList
          reviews={[]}
          title="No Reviews Yet"
          maxHeight="max-h-80"
          showEmptyState={true}
          emptyStateMessage="No reviews yet. Be the first to leave a review!"
        />
      </div>
    </div>
  );
};

export default ReviewListTest;

