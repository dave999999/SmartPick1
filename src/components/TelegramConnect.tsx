import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, Bell } from 'lucide-react';
import { getTelegramBotLink } from '@/lib/telegram';
import { useTelegramStatus } from '@/hooks/useTelegramStatus';
import { toast } from 'sonner';

interface TelegramConnectProps {
  userId: string;
  userType: 'partner' | 'customer';
}

export function TelegramConnect({ userId, userType }: TelegramConnectProps) {
  const { connected, username, loading, disconnect, refresh } = useTelegramStatus(userId);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = () => {
    const botLink = getTelegramBotLink(userId);
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔗 [${timestamp}] Fresh Telegram bot link generated:`, botLink);
    console.log('👤 User ID:', userId);
    
    // Decode and verify the start parameter
    const startParam = botLink.split('?start=')[1];
    const decoded = atob(startParam.replace(/-/g, '+').replace(/_/g, '/'));
    console.log('🔓 Decoded userId:', decoded);
    console.log('✅ UUIDs match:', decoded === userId);
    
    window.open(botLink, '_blank');
    toast.success(`🔗 Fresh link opened at ${timestamp}`, {
      description: '📱 Click START in Telegram to connect. This link expires in 24 hours.',
      duration: 8000,
    });
    
    // Auto-refresh status multiple times to catch the connection
    setTimeout(() => {
      refresh();
      toast.info('🔄 Checking connection status...');
    }, 3000);
    
    setTimeout(() => {
      refresh();
    }, 6000);
    
    setTimeout(() => {
      refresh();
    }, 10000);
    
    setTimeout(() => {
      refresh();
    }, 15000);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await disconnect();
    toast.success('Notifications disabled');
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <Card className="p-5 border-gray-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
            <div className="h-3 bg-gray-100 rounded w-48 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  const isConnected = !!connected;

  return (
    <Card className={`relative overflow-hidden border-none shadow-md transition-all duration-300 ${
      isConnected
        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50'
        : 'bg-gradient-to-br from-blue-50 to-blue-100/50'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            isConnected
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md'
              : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md'
          }`}>
            <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Connected State */}
            {isConnected ? (
              <div>
                {/* Header - Compact */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm">Telegram Notifications</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>

                {/* Username Badge - Inline */}
                {username && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm border border-emerald-200 text-xs font-medium text-gray-700">
                      @{username}
                    </span>
                  </div>
                )}

                {/* Status Text - Compact */}
                <p className="text-xs text-gray-600 mb-3">
                  ✅ Receiving instant alerts for {userType === 'partner' ? 'new reservations' : 'your orders'}
                </p>

                {/* Disconnect Button - Compact */}
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors py-1.5 px-3 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
                >
                  {disconnecting ? 'Disabling...' : 'Disable notifications'}
                </button>
              </div>
            ) : (
              /* Disconnected State */
              <div>
                {/* Header - Compact */}
                <h3 className="font-bold text-gray-900 text-sm mb-1">Telegram Notifications</h3>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Get real-time alerts for {userType === 'partner' ? 'new reservations' : 'your orders'}
                </p>

                {/* Connect Button */}
                <Button
                  onClick={handleConnect}
                  size="sm"
                  className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Connect Telegram
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

