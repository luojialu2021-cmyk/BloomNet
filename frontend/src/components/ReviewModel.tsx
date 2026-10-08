import React, { useState } from 'react';
import { X, Star, Calendar, User } from 'lucide-react';
import ReviewForm from './ReviewForm';
import { reservationService } from "../api/services";

interface ReviewModelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => Promise<void>;
  reservationId: string;
  sitterName: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  isOwnerRating?: boolean;
  isSubmitting?: boolean;
}

const ReviewModel: React.FC<ReviewModelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reservationId,
  sitterName,
  ownerName,
  startDate,
  endDate,
  isOwnerRating = true,
  isSubmitting = false
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (rating: number, review: string) => {
    try {
      console.log("Using reservationId:", reservationId); // Log the reservationId

      // Fetch reservation details using reservationService
      const response = await reservationService.getById(reservationId);
      if (response.error) {
        console.error("Error fetching reservation details:", response.error);
        throw new Error(response.error);
      }

      const reservation = response.data;
      if (!reservation) {
        throw new Error("Failed to fetch reservation details.");
      }
      console.log("Fetched reservation:", reservation);

      // Assemble review data
      const reviewData = {
        reservation_id: reservationId,
        reviewer_id: reservation.owner_id,
        reviewee_id: reservation.sitter_id,
        rating,
        review_txt: review,
        creator_identity: "user",
      };

      console.log("Review data to be sent:", reviewData);

      // Submit review data to the API
      await onSubmit(reviewData.rating, reviewData.review_txt);
      setIsSubmitted(true);

      // Call the create_review function to store the review
      const createReviewResponse = await reservationService.createReview(reviewData);
      if (createReviewResponse.error) {
        throw new Error(createReviewResponse.error);
      }

      // Close model after a short delay to show success
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
      }, 1500);
    } catch (error) {
      console.error("Error submitting review:", error);
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const reviewerName = isOwnerRating ? ownerName : sitterName;
  const revieweeName = isOwnerRating ? sitterName : ownerName;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Model */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Rate Your Experience
                </h2>
                <p className="text-sm text-emerald-100 mt-1">
                  How was your experience with {revieweeName}?
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-emerald-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Thank you for your review!
                </h3>
                <p className="text-gray-600">
                  Your feedback helps improve our community.
                </p>
              </div>
            ) : (
              <>
                {/* Reservation Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {isOwnerRating ? 'You' : reviewerName} → {revieweeName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Plant sitting service
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(startDate)} - {formatDate(endDate)}
                    </span>
                  </div>
                </div>

                {/* Review Form */}
                <ReviewForm
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  title=""
                  placeholder={`Share your experience with ${revieweeName}...`}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModel;