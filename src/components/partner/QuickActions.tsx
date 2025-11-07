import { Button } from '@/components/ui/button';
import { Plus, QrCode, BarChart3, HelpCircle } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface QuickActionsProps {
  onNewOffer: () => void;
  onScanQR: () => void;
  onViewAnalytics?: () => void;
  onHelp?: () => void;
}

export default function QuickActions({
  onNewOffer,
  onScanQR,
  onViewAnalytics,
  onHelp,
}: QuickActionsProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const actions = [
    {
      icon: Plus,
      label: 'New Offer',
      onClick: onNewOffer,
      variant: 'default' as const,
      className: 'bg-[#00C896] hover:bg-[#00B588] text-white',
    },
    {
      icon: QrCode,
      label: 'Scan QR',
      onClick: onScanQR,
      variant: 'outline' as const,
    },
  ];

  // Mobile: Fixed bottom bar
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg safe-bottom">
        <div className="grid grid-cols-2 gap-2 p-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant}
                className={`h-14 flex flex-col gap-1 ${action.className || ''}`}
                size="lg"
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop: Horizontal action bar
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex gap-2 flex-1">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant}
              className={action.className || ''}
            >
              <Icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          );
        })}
      </div>
      <div className="flex gap-2">
        {onViewAnalytics && (
          <Button onClick={onViewAnalytics} variant="ghost" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        )}
        {onHelp && (
          <Button onClick={onHelp} variant="ghost" size="sm">
            <HelpCircle className="w-4 h-4 mr-2" />
            Help
          </Button>
        )}
      </div>
    </div>
  );
}
