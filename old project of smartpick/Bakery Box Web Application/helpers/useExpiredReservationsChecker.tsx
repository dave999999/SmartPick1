import { useEffect } from 'react';
import { postCheckExpiredReservations } from '../endpoints/reservations/check_expired_POST.schema';

/**
 * A custom hook that periodically calls the endpoint to check for and process expired reservations.
 * This is a background process and does not return any state. It handles errors silently by logging them to the console.
 * It's intended to be used in a global context provider to run on every page.
 */
export const useExpiredReservationsChecker = () => {
  useEffect(() => {
    const checkReservations = async () => {
      try {
        console.log('Checking for expired reservations...');
        const result = await postCheckExpiredReservations();
        if (result.success) {
          if (result.processedCount > 0) {
            console.log(`Successfully processed ${result.processedCount} expired reservations.`);
          } else {
            console.log('No expired reservations found to process.');
          }
        } 
        // Errors are thrown by the schema helper and will be caught below
      } catch (error) {
        console.error('An error occurred while checking for expired reservations:', error);
      }
    };

    // Call immediately on mount
    checkReservations();

    // Then call every 1 minute
    const intervalId = setInterval(checkReservations, 60000);

    // Clean up the interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array ensures this effect runs only once when the component mounts
};