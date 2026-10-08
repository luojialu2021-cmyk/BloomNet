import React, { useState } from 'react';
import RatingInput from '../components/RatingInput';

const RatingTest: React.FC = () => {
  const [rating1, setRating1] = useState(0);
  const [rating2, setRating2] = useState(0);

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900">Rating Component Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">What to Test</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Click on the stars to set ratings</li>
          <li>• Watch the values update in real-time</li>
          <li>• Test different sizes (sm, md, lg)</li>
          <li>• Interactive vs non-interactive modes</li>
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Interactive Rating</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Small Size</label>
            <RatingInput
              value={rating1}
              onChange={setRating1}
              size="sm"
              interactive={true}
              showLabel={true}
            />
            <p className="text-sm text-gray-500 mt-2">Current value: {rating1}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medium Size</label>
            <RatingInput
              value={rating2}
              onChange={setRating2}
              size="md"
              interactive={true}
              showLabel={true}
            />
            <p className="text-sm text-gray-500 mt-2">Current value: {rating2}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Large Size (Read-only, 4.5 stars)</label>
            <RatingInput
              value={4.5}
              onChange={() => {}}
              size="lg"
              interactive={false}
              showLabel={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Read-only Example (3 stars)</label>
            <RatingInput
              value={3}
              onChange={() => {}}
              size="md"
              interactive={false}
              showLabel={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingTest;

