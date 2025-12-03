import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy Index page (now at /old route)
 * 
 * The old homepage components have been removed:
 * - OfferBottomSheet
 * - TopSearchBar
 * - MapSection  
 * - RestaurantFoodSection
 * - BottomNavBar
 * - FilterDrawer
 * - ReservationModal (old version)
 * 
 * This route now redirects to the main IndexRedesigned page (/)
 */
export default function Index() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to main page immediately
    navigate('/', { replace: true });
  }, [navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white via-[#F0FFF9] to-[#E0F9F0]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Redirecting to main page...</p>
      </div>
    </div>
  );
}
