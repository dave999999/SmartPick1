/**
 * Realtime Connection Monitor
 * 
 * Live monitoring tool for admin to see:
 * - Current active realtime connections
 * - Connection breakdown by channel type
 * - Real-time updates as tabs open/close
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface ConnectionStats {
  totalConnections: number;
  myPicksConnections: number;
  telegramConnections: number;
  presenceConnections: number;
  otherConnections: number;
  lastUpdated: Date;
}

export function RealtimeConnectionMonitor() {
  const [stats, setStats] = useState<ConnectionStats>({
    totalConnections: 0,
    myPicksConnections: 0,
    telegramConnections: 0,
    presenceConnections: 0,
    otherConnections: 0,
    lastUpdated: new Date(),
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Count active subscriptions from Supabase client
  const countLocalConnections = () => {
    try {
      // @ts-ignore - accessing internal channels
      const channels = supabase.getChannels ? supabase.getChannels() : [];
      
      let myPicks = 0;
      let telegram = 0;
      let presence = 0;
      let other = 0;

      channels.forEach((channel: any) => {
        const channelName = channel.topic || '';
        
        if (channelName.includes('reservations') || channelName.includes('my-picks')) {
          myPicks++;
        } else if (channelName.includes('telegram')) {
          telegram++;
        } else if (channelName.includes('presence')) {
          presence++;
        } else {
          other++;
        }
      });

      setStats({
        totalConnections: channels.length,
        myPicksConnections: myPicks,
        telegramConnections: telegram,
        presenceConnections: presence,
        otherConnections: other,
        lastUpdated: new Date(),
      });

      logger.log('📊 Connection count:', {
        total: channels.length,
        myPicks,
        telegram,
        presence,
        other,
      });
    } catch (error) {
      logger.error('Failed to count connections:', error);
    }
  };

  // Start monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    countLocalConnections();

    if (!autoRefresh) return;

    // Refresh every 2 seconds
    const interval = setInterval(countLocalConnections, 2000);

    return () => clearInterval(interval);
  }, [isMonitoring, autoRefresh]);

  // Test visibility detection
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
      logger.log('👁️ Tab visibility changed:', document.hidden ? 'HIDDEN' : 'VISIBLE');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const getStatusColor = (count: number) => {
    if (count === 0) return 'bg-gray-500';
    if (count < 50) return 'bg-green-500';
    if (count < 100) return 'bg-yellow-500';
    if (count < 150) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getUsagePercent = (count: number) => {
    return Math.round((count / 200) * 100);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Realtime Connection Monitor
            </CardTitle>
            <CardDescription>
              Live monitoring of Supabase realtime connections (Free tier: 200 max)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isTabVisible ? (
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                Tab Visible
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <EyeOff className="h-3 w-3" />
                Tab Hidden
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            variant={isMonitoring ? 'destructive' : 'default'}
            size="sm"
          >
            {isMonitoring ? (
              <>
                <WifiOff className="h-4 w-4 mr-2" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
          <Button
            onClick={countLocalConnections}
            variant="outline"
            size="sm"
            disabled={!isMonitoring}
          >
            Refresh Now
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
            disabled={!isMonitoring}
          >
            Auto: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>

        {isMonitoring ? (
          <div className="space-y-4">
            {/* Total Connections */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Active Connections
                </span>
                <Badge className={getStatusColor(stats.totalConnections)}>
                  {stats.totalConnections} / 200
                </Badge>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(
                    stats.totalConnections
                  )}`}
                  style={{ width: `${Math.min(getUsagePercent(stats.totalConnections), 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {getUsagePercent(stats.totalConnections)}% of free tier limit
              </div>
            </div>

            {/* Connection Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">MyPicks Page</div>
                <div className="text-2xl font-bold">{stats.myPicksConnections}</div>
                <div className="text-xs text-gray-500">
                  {stats.myPicksConnections > 0 ? '✅ Active' : '⚪ Inactive'}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Telegram</div>
                <div className="text-2xl font-bold">{stats.telegramConnections}</div>
                <div className="text-xs text-gray-500">
                  {stats.telegramConnections > 0 ? '✅ Active' : '⚪ Inactive'}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Presence</div>
                <div className="text-2xl font-bold">{stats.presenceConnections}</div>
                <div className="text-xs text-gray-500">
                  {stats.presenceConnections > 0 ? '✅ Active' : '⚪ Inactive'}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Other</div>
                <div className="text-2xl font-bold">{stats.otherConnections}</div>
                <div className="text-xs text-gray-500">
                  {stats.otherConnections > 0 ? '✅ Active' : '⚪ Inactive'}
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-gray-500 text-center">
              Last updated: {stats.lastUpdated.toLocaleTimeString()}
              {autoRefresh && ' • Auto-refreshing every 2s'}
            </div>

            {/* Testing Instructions */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
              <div className="font-semibold mb-2">🧪 Testing Instructions:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Keep this monitor visible</li>
                <li>Open MyPicks in another tab → watch count increase</li>
                <li>Switch to MyPicks tab → count stays same (visible)</li>
                <li>Switch away from MyPicks → count should decrease (hidden)</li>
                <li>Return to MyPicks → count increases again (reconnected)</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Click "Start Monitoring" to begin tracking connections
          </div>
        )}
      </CardContent>
    </Card>
  );
}
