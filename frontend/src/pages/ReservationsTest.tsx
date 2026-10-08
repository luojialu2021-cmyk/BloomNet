import React, { useState } from 'react';
import ReservationCard from '../components/ReservationCard';
import ReviewModel from '../components/ReviewModel';
import type { Reservation } from '../api/types';

const ReservationsTest: React.FC = () => {
  const [reviewModel, setReviewModel] = useState<{
    isOpen: boolean;
    reservation: Reservation | null;
    isOwnerRating: boolean;
  }>({
    isOpen: false,
    reservation: null,
    isOwnerRating: true,
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState<Array<{
    reservationId: string;
    rating: number;
    review: string;
    timestamp: string;
    type: string;
  }>>([]);

  const sampleReservations: Reservation[] = [
    {
      id: 'reservation-1',
      owner_id: 'owner-1',
      sitter_id: 'sitter-1',
      sitter_name: 'Alex Green',
      start_date: '2024-01-15',
      end_date: '2024-01-20',
      total_amount: 125,
      plants_info: '3 tropical plants, 2 succulents',
      care_instructions: 'Water every 2 days',
      location_address: '123 Main St, Baltimore, MD',
      status: 'completed',
      payment_status: 'paid',
      care_updates: [],
      care_checklist: [],
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-20T18:00:00Z',
      completed_at: '2024-01-20T18:00:00Z',
    },
  ];

  const userNames: Record<string, string> = {
    'owner-1': 'You',
    'sitter-1': 'Alex Green',
  };

  const canRateReservation = (reservation: Reservation, isOwnerRating: boolean) => {
    if (reservation.status !== 'completed') return false;
    
    if (isOwnerRating) {
      return !reservation.owner_rating;
    } else {
      return !reservation.sitter_rating;
    }
  };

  const handleRateReservation = (reservation: Reservation, isOwnerRating: boolean) => {
    setReviewModel({
      isOpen: true,
      reservation,
      isOwnerRating,
    });
  };

  const handleSubmitReview = async (rating: number, review: string) => {
    if (!reviewModel.reservation) return;

    setIsSubmittingReview(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSubmittedReviews(prev => [{
      reservationId: reviewModel.reservation!.id as string,
      rating,
      review,
      timestamp: new Date().toLocaleString(),
      type: reviewModel.isOwnerRating ? 'Owner Rating' : 'Sitter Rating'
    }, ...prev]);
    
    setIsSubmittingReview(false);
  };

  return (
    <div className="max-w-6xl p-8 mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900">Reservations Integration Test</h1>
      
      <div className="p-6 border border-blue-200 bg-blue-50 rounded-2xl">
        <h3 className="mb-2 text-lg font-semibold text-blue-900">What to Test</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• "Rate sitter" button appears for completed reservations</li>
          <li>• Clicking button opens ReviewModel</li>
          <li>• Submit review to see success animation</li>
        </ul>
      </div>

      <div className="grid gap-4">
        {sampleReservations.map((reservation) => (
          <div key={reservation.id} className="space-y-3">
            <ReservationCard
              reservation={reservation}
              role="owner"
              counterpartName={userNames[reservation.sitter_id]}
            />
            <div className="flex flex-wrap items-center gap-2">
              {canRateReservation(reservation, true) && (
                <button
                  onClick={() => handleRateReservation(reservation, true)}
                  className="px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200"
                >
                  Rate sitter
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {submittedReviews.length > 0 && (
        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Submitted Reviews</h2>
          <div className="space-y-4">
            {submittedReviews.map((review, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
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
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    review.type === 'Owner Rating' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {review.type}
                  </span>
                </div>
                <p className="text-gray-700">{review.review}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewModel.reservation && (
        <ReviewModel
          isOpen={reviewModel.isOpen}
          onClose={() => setReviewModel({ isOpen: false, reservation: null, isOwnerRating: true })}
          onSubmit={handleSubmitReview}
          reservationId={reviewModel.reservation.id as string}
          sitterName={userNames[reviewModel.reservation.sitter_id] || "Sitter"}
          ownerName={userNames[reviewModel.reservation.owner_id] || "Owner"}
          startDate={reviewModel.reservation.start_date}
          endDate={reviewModel.reservation.end_date}
          isOwnerRating={reviewModel.isOwnerRating}
          isSubmitting={isSubmittingReview}
        />
      )}
    </div>
  );
};

export default ReservationsTest;

