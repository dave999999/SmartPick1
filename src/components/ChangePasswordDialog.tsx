/**
 * ChangePasswordDialog - Reusable password change modal
 * 
 * Can be used in both user profile and partner settings
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword } from '@/lib/api';
import { logger } from '@/lib/logger';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error('გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('პაროლები არ ემთხვევა');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო');
      return;
    }

    // Check for password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUpperCase || !hasNumber) {
      toast.error('პაროლი უნდა შეიცავდეს მინიმუმ ერთ დიდ ასოს და ერთ ციფრს');
      return;
    }

    setIsChanging(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;

      toast.success('✅ პაროლი წარმატებით შეიცვალა!');
      setNewPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error updating password:', error);
      toast.error('პაროლის შეცვლა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.');
    } finally {
      setIsChanging(false);
    }
  };

  const handleCancel = () => {
    setNewPassword('');
    setConfirmPassword('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            პაროლის შეცვლა
          </DialogTitle>
          <DialogDescription>
            შეიყვანეთ ახალი პაროლი თქვენი ანგარიშის უსაფრთხოებისთვის
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">ახალი პაროლი *</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="მინიმუმ 8 სიმბოლო"
                className="pr-10"
                disabled={isChanging}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს, ერთ დიდ ასოს და ერთ ციფრს
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">პაროლის დადასტურება *</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="გაიმეორეთ პაროლი"
                className="pr-10"
                disabled={isChanging}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isChanging}
              className="flex-1"
            >
              გაუქმება
            </Button>
            <Button
              type="submit"
              disabled={isChanging}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isChanging ? 'შენახვა...' : 'პაროლის შეცვლა'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
