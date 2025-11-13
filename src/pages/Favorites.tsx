import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer } from '@/lib/types';
import { getActiveOffers } from '@/lib/api';
import { useFavorites } from '@/hooks/useFavorites';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MapPin, Clock, Heart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveOfferImageUrl } from '@/lib/api';

export default function Favorites() {
  const navigate = useNavigate();
  const { favorites, getFavoritesByType, removeFavorite } = useFavorites();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavoriteOffers();
  }, [favorites]);

  const loadFavoriteOffers = async () => {
    try {
      const favoriteOffers = getFavoritesByType('offer');
      if (favoriteOffers.length === 0) {
        setOffers([]);
        setIsLoading(false);
        return;
      }

      // Get all active offers
      const allOffers = await getActiveOffers();
      
      // Filter to only favorites
      const favoriteIds = favoriteOffers.map(fav => fav.id);
      const filteredOffers = allOffers.filter(offer => favoriteIds.includes(offer.id));
      
      setOffers(filteredOffers);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfferClick = (offer: Offer) => {
    navigate(`/?offer=${offer.id}`);
  };

  const handleRemoveFavorite = (e: React.MouseEvent, offerId: string) => {
    e.stopPropagation();
    removeFavorite(offerId, 'offer');
  };

  // Check if favorited offer is still available in active offers
  const isOfferAvailable = (offerId: string) => {
    return offers.some(offer => offer.id === offerId);
  };

  const favoriteOfferIds = getFavoritesByType('offer').map(fav => fav.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Favorites</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading favorites...</p>
          </div>
        ) : favoriteOfferIds.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
            <p className="text-gray-500 mb-6">Start adding offers to your favorites!</p>
            <Button onClick={() => navigate('/')} className="bg-[#FF6B35] hover:bg-[#E55A25]">
              Browse Offers
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {favoriteOfferIds.map((offerId) => {
              const offer = offers.find(o => o.id === offerId);
              const isAvailable = isOfferAvailable(offerId);

              return (
                <Card
                  key={offerId}
                  className={`overflow-hidden cursor-pointer transition-all ${
                    isAvailable 
                      ? 'hover:shadow-lg' 
                      : 'opacity-60 bg-gray-50'
                  }`}
                  onClick={() => isAvailable && offer && handleOfferClick(offer)}
                >
                  <div className="flex gap-4 p-4">
                    {/* Image */}
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                      {offer ? (
                        <>
                          <img
                            src={offer.images?.[0] || 'https://via.placeholder.com/96x96?text=No+Image'}
                            alt={offer.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/96x96?text=No+Image';
                            }}
                          />
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <AlertCircle className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                          {offer?.title || 'Offer no longer available'}
                        </h3>
                        <button
                          onClick={(e) => handleRemoveFavorite(e, offerId)}
                          className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                        </button>
                      </div>

                      {isAvailable && offer ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">
                              {offer.partner?.business_name || 'Partner'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-[#FF6B35]">
                              {offer.smart_price} pts
                            </span>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>Available</span>
                            </div>
                          </div>

                          {offer.partner?.business_name && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>⭐ Active offer</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">This offer is no longer available</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            The seller has removed this offer or it has expired.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
