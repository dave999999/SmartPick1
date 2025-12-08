import { useState, useEffect } from 'react';

/**
 * Debounces a value by delaying updates
 * Useful for preventing excessive API calls during rapid changes (e.g., map panning)
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 * 
 * @example
 * ```tsx
 * const [mapBounds, setMapBounds] = useState(null);
 * const debouncedBounds = useDebouncedValue(mapBounds, 500);
 * 
 * // debouncedBounds only updates 500ms after mapBounds stops changing
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timeout if value changes (cleanup function)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
