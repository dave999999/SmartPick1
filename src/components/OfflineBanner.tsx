import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <Alert className="rounded-none border-x-0 border-t-0 bg-orange-500 text-white border-orange-600">
        <WifiOff className="h-5 w-5 text-white" />
        <AlertDescription className="ml-2 font-medium">
          You're offline. Some features may be limited. Your active reservations are still accessible.
        </AlertDescription>
      </Alert>
    </div>
  );
}
