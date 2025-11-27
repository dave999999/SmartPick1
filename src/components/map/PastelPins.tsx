// SmartPick Light Mode — Pastel Pin Components
// Each pin is a rounded teardrop with pastel fill and line icon

import React from 'react';

interface PinProps {
  size?: number;
  className?: string;
}

export const BakeryPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#EF8A7E"
      stroke="#D97166"
      strokeWidth="1"
    />
    <path 
      d="M12 10h8M12 12h8M12 14h6M16 14v3M18 17h-4"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const CoffeePin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#7BAFC2"
      stroke="#6A9AAC"
      strokeWidth="1"
    />
    <path 
      d="M11 10h8c0 2.21-1.79 4-4 4s-4-1.79-4-4zM19 12c1.1 0 2 .9 2 2s-.9 2-2 2M13 14v3M15 14v3M17 14v3"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const DessertsPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#FFB5CC"
      stroke="#F09DB9"
      strokeWidth="1"
    />
    <path 
      d="M16 8c2.21 0 4 1.79 4 4h-8c0-2.21 1.79-4 4-4zM12 12v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2M14 9v1M16 8v2M18 9v1"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const FreshProducePin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#A5D2A1"
      stroke="#8FBE8C"
      strokeWidth="1"
    />
    <circle cx="16" cy="11" r="4" stroke="white" strokeWidth="1.2" fill="none" />
    <path 
      d="M16 7v2M16 13v2M12 11h2M18 11h2"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const MeatFishPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#E89B9B"
      stroke="#D88484"
      strokeWidth="1"
    />
    <path 
      d="M11 9c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v3c0 2.21-1.79 4-4 4h-2c-2.21 0-4-1.79-4-4V9z"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path 
      d="M13 9v2M15 9v2M17 9v2M19 9v2"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const HotMealsPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#EDAD72"
      stroke="#DC9A5F"
      strokeWidth="1"
    />
    <circle cx="16" cy="11" r="5" stroke="white" strokeWidth="1.2" fill="none" />
    <path 
      d="M14 8c.5-1 1.5-1 2 0M16 11v3M13 11l2.5 2.5M19 11l-2.5 2.5"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PizzaPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#E5C26B"
      stroke="#D4AF58"
      strokeWidth="1"
    />
    <circle cx="16" cy="11" r="5" stroke="white" strokeWidth="1.2" fill="none" />
    <circle cx="14" cy="10" r="1" fill="white" />
    <circle cx="18" cy="10" r="1" fill="white" />
    <circle cx="16" cy="13" r="1" fill="white" />
  </svg>
);

export const HealthyPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#8FD69F"
      stroke="#7BC28A"
      strokeWidth="1"
    />
    <path 
      d="M12 13l2 2 4-4M12 9h8M12 15h8"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const DrinksPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#88A8B9"
      stroke="#7595A5"
      strokeWidth="1"
    />
    <path 
      d="M13 8h6l-1 8h-4l-1-8zM13 8h6M16 16v2"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const PreparedMealsPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#C9A988"
      stroke="#B89775"
      strokeWidth="1"
    />
    <rect x="11" y="9" width="10" height="8" rx="1" stroke="white" strokeWidth="1.2" fill="none" />
    <path 
      d="M13 12h6M13 14h6"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const SnacksPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#F5C17A"
      stroke="#E4AE66"
      strokeWidth="1"
    />
    <circle cx="14" cy="10" r="2" stroke="white" strokeWidth="1.2" fill="none" />
    <circle cx="18" cy="10" r="2" stroke="white" strokeWidth="1.2" fill="none" />
    <path 
      d="M13 14c0-1.66 1.34-3 3-3s3 1.34 3 3"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const GroceryPin: React.FC<PinProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 2C11.03 2 7 5.92 7 10.75C7 16.65 13.55 23.8 15.29 25.46C15.68 25.83 16.32 25.83 16.71 25.46C18.45 23.8 25 16.65 25 10.75C25 5.92 20.97 2 16 2Z"
      fill="#B8A49C"
      stroke="#A79189"
      strokeWidth="1"
    />
    <path 
      d="M11 8l1 8h8l1-8H11zM12 16v1M20 16v1"
      stroke="white"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Export all pins as a map for easy access
export const PASTEL_PINS = {
  bakery: BakeryPin,
  coffee: CoffeePin,
  desserts: DessertsPin,
  'fresh-produce': FreshProducePin,
  'meat-fish': MeatFishPin,
  'hot-meals': HotMealsPin,
  pizza: PizzaPin,
  healthy: HealthyPin,
  drinks: DrinksPin,
  'prepared-meals': PreparedMealsPin,
  snacks: SnacksPin,
  grocery: GroceryPin,
};

export const PASTEL_PIN_COLORS = {
  bakery: '#EF8A7E',
  coffee: '#7BAFC2',
  desserts: '#FFB5CC',
  'fresh-produce': '#A5D2A1',
  'meat-fish': '#E89B9B',
  'hot-meals': '#EDAD72',
  pizza: '#E5C26B',
  healthy: '#8FD69F',
  drinks: '#88A8B9',
  'prepared-meals': '#C9A988',
  snacks: '#F5C17A',
  grocery: '#B8A49C',
};
