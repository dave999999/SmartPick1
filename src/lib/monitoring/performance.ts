/**
 * Performance Monitoring System for SmartPick
 * 
 * Tracks database query performance, alerts on slow queries,
 * and provides health check functionality.
 * 
 * Usage:
 * ```typescript
 * import { monitoredQuery, performanceMonitor } from '@/lib/monitoring/performance';
 * 
 * // Wrap critical queries
 * const offers = await monitoredQuery(
 *   'get_offers_viewport',
 *   () => supabase.rpc('get_offers_in_viewport', {...})
 * );
 * 
 * // Check database health
 * const health = await performanceMonitor.checkDatabaseHealth();
 * console.log('Database healthy:', health.healthy);
 * 
 * // Get performance metrics
 * const metrics = performanceMonitor.getMetrics();
 * console.log('Avg query time:', metrics.avgDuration, 'ms');
 * ```
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  offersCount?: number;
  error?: string;
  timestamp: number;
}

interface PerformanceMetrics {
  total: number;
  avgDuration: number;
  successRate: number;
  slowQueries: number;
  p50: number;
  p95: number;
  p99: number;
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly MAX_METRICS = 200;
  private readonly SLOW_QUERY_THRESHOLD = 100; // ms
  private healthHistory: HealthCheckResult[] = [];
  private readonly MAX_HEALTH_HISTORY = 50;

  /**
   * Track a database query execution
   */
  trackQuery(query: string, startTime: number, success: boolean, error?: string) {
    const duration = Date.now() - startTime;
    
    this.metrics.push({
      query,
      duration,
      timestamp: Date.now(),
      success,
      error,
    });

    // Keep only last N metrics to prevent memory bloat
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Alert on slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD && success) {
      logger.warn(`⚠️ Slow query detected: ${query} took ${duration}ms`, {
        duration,
        threshold: this.SLOW_QUERY_THRESHOLD,
        query,
      });
    }

    // Alert on failed queries
    if (!success) {
      logger.error(`❌ Query failed: ${query}`, {
        error,
        duration,
        query,
      });
    }
  }

  /**
   * Get aggregated performance metrics
   */
  getMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        successRate: 0,
        slowQueries: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const successfulMetrics = this.metrics.filter(m => m.success);
    const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);

    return {
      total: this.metrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length || 0,
      successRate: successfulMetrics.length / this.metrics.length,
      slowQueries: this.metrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length,
      p50: this.percentile(durations, 0.50),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
    };
  }

  /**
   * Get query metrics for a specific query name
   */
  getQueryMetrics(queryName: string): PerformanceMetrics {
    const queryMetrics = this.metrics.filter(m => m.query === queryName);
    
    if (queryMetrics.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        successRate: 0,
        slowQueries: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const successfulMetrics = queryMetrics.filter(m => m.success);
    const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);

    return {
      total: queryMetrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length || 0,
      successRate: successfulMetrics.length / queryMetrics.length,
      slowQueries: queryMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length,
      p50: this.percentile(durations, 0.50),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
    };
  }

  /**
   * Check database health by testing viewport query
   */
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test viewport query with Tbilisi coordinates
      const { data, error } = await supabase.rpc('get_offers_in_viewport', {
        p_north: 41.8,
        p_south: 41.6,
        p_east: 44.9,
        p_west: 44.7,
        p_category: null,
        p_limit: 10
      });

      const responseTime = Date.now() - startTime;
      
      if (error) throw error;
      
      const result: HealthCheckResult = {
        healthy: true,
        responseTime,
        offersCount: data?.length || 0,
        timestamp: Date.now(),
      };

      this.healthHistory.push(result);
      if (this.healthHistory.length > this.MAX_HEALTH_HISTORY) {
        this.healthHistory = this.healthHistory.slice(-this.MAX_HEALTH_HISTORY);
      }

      logger.log('✅ Database health check passed', {
        responseTime,
        offersCount: result.offersCount,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        healthy: false,
        responseTime,
        error: String(error),
        timestamp: Date.now(),
      };

      this.healthHistory.push(result);
      if (this.healthHistory.length > this.MAX_HEALTH_HISTORY) {
        this.healthHistory = this.healthHistory.slice(-this.MAX_HEALTH_HISTORY);
      }

      logger.error('❌ Database health check failed', {
        error: String(error),
        responseTime,
      });

      return result;
    }
  }

  /**
   * Get health check history
   */
  getHealthHistory(): HealthCheckResult[] {
    return [...this.healthHistory];
  }

  /**
   * Check connection pool status
   */
  async checkConnectionPool(): Promise<{
    activeConnections: number;
    maxConnections: number;
    usagePercent: number;
    idleConnections: number;
    activeQueries: number;
    status: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const { data, error } = await supabase.rpc('get_connection_pool_stats');
      
      if (error) {
        logger.error('Failed to check connection pool:', error);
        return {
          activeConnections: 0,
          maxConnections: 60,
          usagePercent: 0,
          idleConnections: 0,
          activeQueries: 0,
          status: 'warning'
        };
      }

      const result = Array.isArray(data) ? data[0] : data;
      const activeConnections = Number(result?.active_connections || 0);
      const maxConnections = Number(result?.max_connections || 60);
      const usagePercent = Number(result?.usage_percent || 0);
      const idleConnections = Number(result?.idle_connections || 0);
      const activeQueries = Number(result?.active_queries || 0);

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (usagePercent >= 90) status = 'critical';
      else if (usagePercent >= 80) status = 'warning';

      logger.log(`📊 Connection pool: ${activeConnections}/${maxConnections} (${usagePercent.toFixed(1)}%) - ${status}`);

      return {
        activeConnections,
        maxConnections,
        usagePercent,
        idleConnections,
        activeQueries,
        status
      };
    } catch (error) {
      logger.error('Error checking connection pool:', error);
      return {
        activeConnections: 0,
        maxConnections: 60,
        usagePercent: 0,
        idleConnections: 0,
        activeQueries: 0,
        status: 'warning'
      };
    }
  }

  /**
   * Get recent health status (last 10 checks)
   */
  getRecentHealthStatus(): { healthy: boolean; successRate: number } {
    const recent = this.healthHistory.slice(-10);
    
    if (recent.length === 0) {
      return { healthy: true, successRate: 1 };
    }

    const healthyCount = recent.filter(h => h.healthy).length;
    const successRate = healthyCount / recent.length;

    return {
      healthy: successRate >= 0.9, // 90% or better
      successRate,
    };
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics() {
    this.metrics = [];
    this.healthHistory = [];
    logger.log('🧹 Performance metrics cleared');
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Export metrics for external monitoring (e.g., Grafana, Datadog)
   */
  exportMetrics() {
    const metrics = this.getMetrics();
    const health = this.getRecentHealthStatus();

    return {
      performance: metrics,
      health: health,
      timestamp: Date.now(),
      uptime: process.uptime?.() || 0,
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Wrapper for monitored queries
 * 
 * Automatically tracks query performance and alerts on issues
 * 
 * @example
 * ```typescript
 * const offers = await monitoredQuery(
 *   'get_offers_viewport',
 *   async () => {
 *     const { data, error } = await supabase.rpc('get_offers_in_viewport', {...});
 *     if (error) throw error;
 *     return data;
 *   }
 * );
 * ```
 */
export async function monitoredQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    performanceMonitor.trackQuery(queryName, startTime, true);
    return result;
  } catch (error) {
    performanceMonitor.trackQuery(queryName, startTime, false, String(error));
    throw error;
  }
}

/**
 * React hook for performance monitoring
 * 
 * @example
 * ```typescript
 * function PerformanceWidget() {
 *   const metrics = usePerformanceMetrics();
 *   
 *   return (
 *     <div>
 *       <p>Avg Query Time: {metrics.avgDuration.toFixed(0)}ms</p>
 *       <p>Success Rate: {(metrics.successRate * 100).toFixed(1)}%</p>
 *       <p>Slow Queries: {metrics.slowQueries}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceMetrics(refreshInterval: number = 5000) {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return metrics;
}

// Auto-run health check only in development
// Admin dashboard has dedicated health panel for production monitoring
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  setInterval(() => {
    performanceMonitor.checkDatabaseHealth().catch(error => {
      logger.error('Scheduled health check failed', error);
    });
  }, 5 * 60 * 1000); // 5 minutes
}

// Export types
export type { QueryMetrics, HealthCheckResult, PerformanceMetrics };
