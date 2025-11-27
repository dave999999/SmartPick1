import React from 'react';
import { Button } from '@/components/ui/button';
import { UserCircle, Users } from 'lucide-react';

interface ProfileActionsCompactProps {
  onEditProfile?: () => void;
  onInviteFriends?: () => void;
}

/**
 * ProfileActionsCompact - Ultra-compact action buttons
 * 
 * Two small, full-width buttons for primary actions.
 * Minimal height (42-44px), clear CTAs.
 */
export function ProfileActionsCompact({ onEditProfile, onInviteFriends }: ProfileActionsCompactProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={onEditProfile}
        variant="outline"
        size="sm"
        className="h-10 text-[12px] font-medium"
      >
        <UserCircle className="w-4 h-4 mr-1.5" />
        Update Profile
      </Button>
      <Button
        onClick={onInviteFriends}
        size="sm"
        className="h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[12px] font-medium"
      >
        <Users className="w-4 h-4 mr-1.5" />
        Invite Friends
      </Button>
    </div>
  );
}
