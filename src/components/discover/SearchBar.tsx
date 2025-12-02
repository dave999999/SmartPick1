/**
 * SearchBar - Pill-shaped search input
 */

import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search offers..." }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-12 pr-4 bg-gray-100 rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
      />
    </div>
  );
}
