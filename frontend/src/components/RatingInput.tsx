import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingInputProps {
  value?: number; // Optional for controlled mode
  onChange?: (rating: number) => void; // Optional for controlled mode
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showLabel?: boolean;
}

const RatingInput: React.FC<RatingInputProps> = ({
  value,
  onChange,
  maxRating = 5,
  size = 'md',
  interactive = true,
  showLabel = false
}) => {
  const [internalRating, setInternalRating] = useState(0);
  const isControlled = value !== undefined;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = (selectedRating: number) => {
    if (interactive) {
      if (isControlled) {
        onChange?.(selectedRating);
      } else {
        setInternalRating(selectedRating);
      }
    }
  };

  const currentRating = isControlled ? value! : internalRating;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }, (_, index) => {
          const starRating = index + 1;
          const isFilled = starRating <= currentRating;

          return (
            <span
              key={index}
              onClick={() => handleClick(starRating)}
              className={`${sizeClasses[size]} transition-colors ${
                interactive 
                  ? 'hover:scale-110 cursor-pointer' 
                  : 'cursor-default'
              } ${
                isFilled 
                  ? 'text-amber-400' 
                  : 'text-gray-300'
              }`}
            >
              <Star 
                className={`${sizeClasses[size]} ${
                  isFilled ? 'fill-current' : ''
                }`}
              />
            </span>
          );
        })}
        {showLabel && (
          <span className="ml-2 text-sm text-gray-600">
            {currentRating > 0 ? `${currentRating} out of ${maxRating}` : 'Not rated'}
          </span>
        )}
      </div>
    </div>
  );
};

export default RatingInput;