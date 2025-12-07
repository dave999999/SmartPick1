export interface Offer {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  pointsRequired: number;
  maxQuantity: number;
  pickupWindow: {
    start: string;
    end: string;
  };
  location: string;
  expiresAt: string;
}

export const isOfferExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

export const filterActiveOffers = <T extends { expiresAt: string }>(offers: T[]): T[] => {
  return offers.filter(offer => !isOfferExpired(offer.expiresAt));
};
