/**
 * Automated Alert System
 * Proactive monitoring and notifications for critical platform events
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface AlertRule {
  id?: string;
  name: string;
  description: string;
  category: 'REVENUE' | 'ERRORS' | 'PERFORMANCE' | 'SECURITY' | 'PARTNERS' | 'USERS';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  condition_type: 'THRESHOLD' | 'PERCENTAGE_DROP' | 'PATTERN' | 'ANOMALY';
  metric: string; // e.g., 'revenue_per_hour', 'error_rate', 'active_users'
  threshold_value?: number;
  comparison: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'CHANGE_BY';
  time_window_minutes: number; // Check interval
  notification_channels: ('EMAIL' | 'IN_APP' | 'SLACK' | 'SMS')[];
  enabled: boolean;
  created_at?: string;
  last_triggered?: string;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  current_value: number;
  threshold_value: number;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_at?: string;
}

/**
 * Create a new alert rule
 */
export async function createAlertRule(rule: AlertRule): Promise<{ success: boolean; message: string; rule_id?: string }> {
  try {
    const { data, error } = await supabase
      .from('alert_rules')
      .insert({
        name: rule.name,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
        condition_type: rule.condition_type,
        metric: rule.metric,
        threshold_value: rule.threshold_value,
        comparison: rule.comparison,
        time_window_minutes: rule.time_window_minutes,
        notification_channels: rule.notification_channels,
        enabled: rule.enabled,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Alert rule created successfully',
      rule_id: data.id,
    };
  } catch (error) {
    logger.error('[Admin] Failed to create alert rule', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create alert rule',
    };
  }
}

/**
 * Get all alert rules
 */
export async function getAlertRules(): Promise<AlertRule[]> {
  try {
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[Admin] Failed to get alert rules', error);
    return [];
  }
}

/**
 * Update alert rule
 */
export async function updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('alert_rules')
      .update(updates)
      .eq('id', ruleId);

    if (error) throw error;

    return {
      success: true,
      message: 'Alert rule updated successfully',
    };
  } catch (error) {
    logger.error('[Admin] Failed to update alert rule', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update alert rule',
    };
  }
}

/**
 * Delete alert rule
 */
export async function deleteAlertRule(ruleId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('alert_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;

    return {
      success: true,
      message: 'Alert rule deleted successfully',
    };
  } catch (error) {
    logger.error('[Admin] Failed to delete alert rule', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete alert rule',
    };
  }
}

/**
 * Get recent alert events
 */
export async function getAlertEvents(limit = 100, includeAcknowledged = true): Promise<AlertEvent[]> {
  try {
    let query = supabase
      .from('alert_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (!includeAcknowledged) {
      query = query.eq('acknowledged', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[Admin] Failed to get alert events', error);
    return [];
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, adminId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('alert_events')
      .update({
        acknowledged: true,
        acknowledged_by: adminId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;

    return {
      success: true,
      message: 'Alert acknowledged',
    };
  } catch (error) {
    logger.error('[Admin] Failed to acknowledge alert', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to acknowledge alert',
    };
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlertEvent(alertId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('alert_events')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;

    return {
      success: true,
      message: 'Alert resolved',
    };
  } catch (error) {
    logger.error('[Admin] Failed to resolve alert', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to resolve alert',
    };
  }
}

/**
 * Test an alert rule (manually trigger)
 */
export async function testAlertRule(ruleId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_test_alert_rule', {
      p_rule_id: ruleId,
    });

    if (error) throw error;

    return {
      success: true,
      message: data.message || 'Alert rule tested successfully',
    };
  } catch (error) {
    logger.error('[Admin] Failed to test alert rule', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to test alert rule',
    };
  }
}

/**
 * Predefined alert rule templates
 */
export const ALERT_TEMPLATES: Omit<AlertRule, 'id' | 'created_at' | 'last_triggered'>[] = [
  {
    name: 'Revenue Drop Alert',
    description: 'Alert when hourly revenue drops by 50% compared to average',
    category: 'REVENUE',
    severity: 'CRITICAL',
    condition_type: 'PERCENTAGE_DROP',
    metric: 'revenue_per_hour',
    threshold_value: 50,
    comparison: 'CHANGE_BY',
    time_window_minutes: 60,
    notification_channels: ['EMAIL', 'IN_APP', 'SLACK'],
    enabled: true,
  },
  {
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds 5%',
    category: 'ERRORS',
    severity: 'CRITICAL',
    condition_type: 'THRESHOLD',
    metric: 'error_rate_percent',
    threshold_value: 5,
    comparison: 'GREATER_THAN',
    time_window_minutes: 15,
    notification_channels: ['EMAIL', 'IN_APP', 'SLACK'],
    enabled: true,
  },
  {
    name: 'Slow Response Time',
    description: 'Alert when average response time exceeds 1000ms',
    category: 'PERFORMANCE',
    severity: 'WARNING',
    condition_type: 'THRESHOLD',
    metric: 'avg_response_time_ms',
    threshold_value: 1000,
    comparison: 'GREATER_THAN',
    time_window_minutes: 10,
    notification_channels: ['EMAIL', 'IN_APP'],
    enabled: true,
  },
  {
    name: 'Partner Inactivity',
    description: 'Alert when active partners drop below 10',
    category: 'PARTNERS',
    severity: 'WARNING',
    condition_type: 'THRESHOLD',
    metric: 'active_partners',
    threshold_value: 10,
    comparison: 'LESS_THAN',
    time_window_minutes: 60,
    notification_channels: ['EMAIL', 'IN_APP'],
    enabled: true,
  },
  {
    name: 'Suspicious Referral Activity',
    description: 'Alert when referral fraud score exceeds threshold',
    category: 'SECURITY',
    severity: 'CRITICAL',
    condition_type: 'THRESHOLD',
    metric: 'referral_fraud_score',
    threshold_value: 80,
    comparison: 'GREATER_THAN',
    time_window_minutes: 5,
    notification_channels: ['EMAIL', 'IN_APP', 'SLACK'],
    enabled: true,
  },
  {
    name: 'Low Daily Active Users',
    description: 'Alert when DAU drops by 30% from weekly average',
    category: 'USERS',
    severity: 'WARNING',
    condition_type: 'PERCENTAGE_DROP',
    metric: 'daily_active_users',
    threshold_value: 30,
    comparison: 'CHANGE_BY',
    time_window_minutes: 1440, // 24 hours
    notification_channels: ['EMAIL', 'IN_APP'],
    enabled: true,
  },
  {
    name: 'Payment Failure Spike',
    description: 'Alert when payment failures exceed 10% of transactions',
    category: 'REVENUE',
    severity: 'CRITICAL',
    condition_type: 'THRESHOLD',
    metric: 'payment_failure_rate',
    threshold_value: 10,
    comparison: 'GREATER_THAN',
    time_window_minutes: 30,
    notification_channels: ['EMAIL', 'IN_APP', 'SLACK', 'SMS'],
    enabled: true,
  },
  {
    name: 'High No-Show Rate',
    description: 'Alert when reservation no-show rate exceeds 20%',
    category: 'USERS',
    severity: 'WARNING',
    condition_type: 'THRESHOLD',
    metric: 'no_show_rate_percent',
    threshold_value: 20,
    comparison: 'GREATER_THAN',
    time_window_minutes: 60,
    notification_channels: ['EMAIL', 'IN_APP'],
    enabled: true,
  },
];

/**
 * Create default alert rules from templates
 */
export async function setupDefaultAlerts(): Promise<{ success: boolean; message: string; created_count: number }> {
  try {
    let created = 0;

    for (const template of ALERT_TEMPLATES) {
      const result = await createAlertRule(template);
      if (result.success) {
        created++;
      }
    }

    return {
      success: true,
      message: `Created ${created} default alert rules`,
      created_count: created,
    };
  } catch (error) {
    logger.error('[Admin] Failed to setup default alerts', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to setup default alerts',
      created_count: 0,
    };
  }
}
