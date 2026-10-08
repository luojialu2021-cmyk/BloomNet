import { reservationService, sitterService } from '../api/services';

export const initializeDevData = async (): Promise<boolean> => {
  try {
    // Create sample sitters
    const sitterResponse = await sitterService.createSampleData();
    if (sitterResponse.error) {
      console.warn('Failed to create sample sitters:', sitterResponse.error);
    } else {
      console.log('✅ Sample sitters created successfully');
    }

    const reservationsResponse = await reservationService.seedDevSample();
    if (reservationsResponse.error) {
      console.warn('Failed to seed sample reservations:', reservationsResponse.error);
    } else {
      console.log('✅ Sample reservations ready');
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize dev data:', error);
    return false;
  }
};

// Auto-initialize if in development mode
if (process.env.NODE_ENV === 'development') {
  // Wait a bit for the app to load, then initialize
  setTimeout(() => {
    initializeDevData().then(success => {
      if (success) {
        console.log('🚀 Development data initialized');
      }
    });
  }, 2000);
}
