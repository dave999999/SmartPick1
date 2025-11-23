import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, Bell, AlertTriangle } from 'lucide-react';
import { getTelegramBotLink } from '@/lib/telegram';
import { useTelegramStatus } from '@/hooks/useTelegramStatus';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TelegramConnectProps {
  userId: string;
  userType: 'partner' | 'customer';
}

export function TelegramConnect({ userId, userType }: TelegramConnectProps) {
  const { connected, username, loading, disconnect, refresh } = useTelegramStatus(userId);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
    setShowConfirmDialog(false);
  };

  const handleToggleClick = () => {
    if (isConnected) {
      setShowConfirmDialog(true);
    } else {
      handleConnect();
    }
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
    <>
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 hover:border-emerald-300 transition-all duration-300">
        {/* Left: Icon + Text */}
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            isConnected
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md'
              : 'bg-gradient-to-br from-gray-300 to-gray-400'
          }`}>
            <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Telegram</h3>
              {isConnected && username && (
                <span className="text-xs text-gray-500 font-medium">@{username}</span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {isConnected ? '✓ Notifications active' : 'Get instant alerts'}
            </p>
          </div>
        </div>

        {/* Right: Toggle Button */}
        <button
          onClick={handleToggleClick}
          disabled={disconnecting}
          className={`relative w-14 h-8 rounded-full transition-all duration-300 disabled:opacity-50 ${
            isConnected
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md'
              : 'bg-gray-300 hover:bg-gray-400'
          }`}
        >
          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
            isConnected ? 'right-1' : 'left-1'
          }`} />
        </button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Turn off notifications?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-gray-600 leading-relaxed">
              {userType === 'partner' 
                ? "You will stop receiving instant alerts for new reservations, order updates, and other important notifications."
                : "You will stop receiving instant alerts for your orders and updates."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl border-2 hover:bg-gray-50">
              No, keep active
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-md"
            >
              {disconnecting ? 'Turning off...' : 'Yes, turn off'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

