/**
 * Queue Status Indicator - Shows pending sync requests
 */

import { useState, useEffect } from 'react';
import { requestQueue } from '@/lib/requestQueue';
import { QueuedRequest } from '@/lib/indexedDB';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function QueueStatus() {
  const [queuedRequests, setQueuedRequests] = useState<QueuedRequest[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const isOnline = useOnlineStatus();

  const loadQueue = async () => {
    const status = await requestQueue.getQueueStatus();
    setQueuedRequests(status.requests);
  };

  useEffect(() => {
    loadQueue();

    // Poll queue status every 10 seconds
    const interval = setInterval(loadQueue, 10000);

    // Listen for queue changes
    const handleQueueChange = () => loadQueue();
    window.addEventListener('queue-updated', handleQueueChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('queue-updated', handleQueueChange);
    };
  }, []);

  const handleRetryNow = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    toast.info('🔄 Syncing queued requests...');
    await requestQueue.processQueue();
    await loadQueue();
  };

  const handleClearQueue = async () => {
    if (confirm('Are you sure you want to clear all queued requests? This cannot be undone.')) {
      await requestQueue.clearQueue();
      await loadQueue();
    }
  };

  if (queuedRequests.length === 0) {
    return null;
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reservation':
        return '🎫 Reservation';
      case 'cancelReservation':
        return '❌ Cancellation';
      default:
        return type;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="fixed bottom-20 left-0 right-0 z-50 mx-4 mb-4"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="bg-orange-500 text-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5" />
            <div>
              <div className="font-semibold">Pending Sync</div>
              <div className="text-xs opacity-90">
                {queuedRequests.length} request{queuedRequests.length !== 1 ? 's' : ''} queued
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline && (
              <Badge variant="secondary" className="bg-green-500 text-white border-0">
                Online
              </Badge>
            )}
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-orange-400">
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {queuedRequests.map((request) => (
                <div 
                  key={request.id}
                  className="bg-white/10 rounded-lg p-3 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium">{getTypeLabel(request.type)}</div>
                    <div className="text-xs opacity-75">
                      {formatTimestamp(request.timestamp)}
                    </div>
                  </div>
                  <div className="text-xs opacity-90">
                    Retries: {request.retries}/{request.maxRetries}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 bg-orange-600 flex gap-2">
              <Button
                onClick={handleRetryNow}
                disabled={!isOnline}
                className="flex-1 bg-white text-orange-600 hover:bg-gray-100"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", !isOnline && "opacity-50")} />
                Sync Now
              </Button>
              <Button
                onClick={handleClearQueue}
                variant="outline"
                className="bg-white/10 text-white hover:bg-white/20 border-white/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
