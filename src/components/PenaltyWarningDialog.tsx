import { AlertTriangle, Info, Clock, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PenaltyWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
}

export function PenaltyWarningDialog({ open, onOpenChange, onAcknowledge }: PenaltyWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <DialogTitle className="text-xl">Important: Pickup Responsibility</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            We noticed you didn't pick up your last reservation. Let's make sure you understand our policy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>This is your free warning!</strong> We understand things happen. 
              However, we need to be fair to our partners and other customers.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              Progressive Penalty System:
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <span className="font-bold text-yellow-700 min-w-[60px]">1st time:</span>
                <span className="text-yellow-800">⚠️ <strong>Warning only</strong> (this is it!)</span>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <span className="font-bold text-orange-700 min-w-[60px]">2nd time:</span>
                <span className="text-orange-800">30 minute suspension</span>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <span className="font-bold text-red-700 min-w-[60px]">3rd time:</span>
                <span className="text-red-800">90 minute suspension</span>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-900 border border-gray-700">
                <span className="font-bold text-white min-w-[60px]">4th time:</span>
                <span className="text-white flex items-center gap-1">
                  <Ban className="w-4 h-4" />
                  24 hour ban
                </span>
              </div>
            </div>
          </div>

          <Alert className="border-green-200 bg-green-50">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 text-sm">
              <strong>Good news:</strong> Partners can forgive penalties if there was a valid reason. 
              You'll be able to request forgiveness if you get penalized.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            onClick={onAcknowledge}
            className="w-full bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white font-semibold"
          >
            I Understand - Won't Happen Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
