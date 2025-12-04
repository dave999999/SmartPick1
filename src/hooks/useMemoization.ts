/**
 * Memoization Utilities
 * Helper hooks and HOCs for performance optimization
 */
import { memo, useMemo, useCallback } from 'react';
import type { ComponentType } from 'react';

/**
 * Generic memo HOC with display name preservation
 * Usage: export default withMemo(MyComponent);
 */
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): ComponentType<P> {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name || 'Component'})`;
  return MemoizedComponent;
}

/**
 * Stable callback that never changes reference
 * Use for callbacks that don't depend on props/state
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  return useCallback(callback, []);
}

/**
 * Memoize array filtering operations
 * Common pattern in offer/reservation lists
 */
export function useFilteredArray<T>(
  array: T[],
  filterFn: (item: T) => boolean,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => array.filter(filterFn), [array, ...deps]);
}

/**
 * Memoize array sorting operations
 */
export function useSortedArray<T>(
  array: T[],
  compareFn: (a: T, b: T) => number,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => [...array].sort(compareFn), [array, ...deps]);
}

/**
 * Memoize expensive computations with dependencies
 */
export function useMemoizedComputation<T>(
  computeFn: () => T,
  deps: React.DependencyList
): T {
  return useMemo(computeFn, deps);
}

/**
 * Create a memoized event handler
 * Prevents re-creation of handlers on every render
 */
export function useMemoizedHandler<T extends (...args: any[]) => any>(
  handler: T,
  deps: React.DependencyList
): T {
  return useCallback(handler, deps);
}
