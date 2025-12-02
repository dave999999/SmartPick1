/**
 * CategoryChipsRow - Horizontal scrollable category chips
 */

import React from 'react';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '⭐' },
  { id: 'BAKERY', label: 'Bakery', emoji: '🥐' },
  { id: 'DAIRY', label: 'Dairy', emoji: '🥛' },
  { id: 'RESTAURANT', label: 'Meals', emoji: '🍽️' },
  { id: 'GROCERY', label: 'Vegetables', emoji: '🥬' },
  { id: 'MEAT_BUTCHER', label: 'Meat', emoji: '🥩' },
  { id: 'FISH_SEAFOOD', label: 'Seafood', emoji: '🐟' },
  { id: 'DESSERTS_SWEETS', label: 'Desserts', emoji: '🍰' },
  { id: 'CAFE', label: 'Café', emoji: '☕' },
  { id: 'DRINKS_JUICE', label: 'Drinks', emoji: '🥤' },
];

interface CategoryChipsRowProps {
  selected: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryChipsRow({ selected, onSelect }: CategoryChipsRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
      {CATEGORIES.map(category => {
        const isActive = selected === category.id;
        
        return (
          <motion.button
            key={category.id}
            onClick={() => onSelect(category.id)}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
              ${
                isActive
                  ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <span className="text-base">{category.emoji}</span>
            <span>{category.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
