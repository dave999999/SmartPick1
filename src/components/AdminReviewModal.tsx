/**
 * AdminReviewModal - Friendly modal for 6th+ missed pickups
 * Explains admin review process in warm, supportive tone
 */

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Users, Clock, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface AdminReviewModalProps {
  penalty: {
    id: string;
    offense_number: number;
    penalty_type: '24hour' | 'permanent';
    suspended_until: string;
  };
  onClose: () => void;
}

export function AdminReviewModal({
  penalty,
  onClose
}: AdminReviewModalProps) {
  const { t } = useI18n();

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-[380px] border-none shadow-xl p-0 max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">ადმინისტრატორის განხილვა</DialogTitle>
        
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5">
          {/* Icon Header */}
          <div className="flex justify-center mb-3">
            <div className="bg-white/80 rounded-full p-3 shadow-sm">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-gray-800 text-center mb-3">
            ჩვენ ვაფასებთ თქვენ 💙
          </h2>

          {/* Explanation */}
          <div className="bg-white/70 rounded-xl p-3 mb-3 space-y-2.5 text-xs text-gray-700">
            <p className="leading-relaxed">
              ბოლო პერიოდში რამდენიმე მიღება გამოტოვდა.
              ვიცით, რომ ცხოვრება ხანდახან არაპროგნოზირებადია 🤗
            </p>

            <p className="leading-relaxed text-indigo-800 bg-indigo-50 rounded-lg p-2">
              დროებით ვზღუდავთ რეზერვაციებს 24 საათით,
              რათა ერთად გავარკვიოთ საუკეთესო გზა გაგრძელებისთვის.
              ჩვენი გუნდი აუცილებლად დაგიკავშირდებათ 💛
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 mb-3">
            <a 
              href="https://t.me/yoursupport" 
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white hover:bg-blue-50 border-2 border-blue-200 text-blue-700 py-2 px-3 rounded-xl text-xs font-medium text-center transition-colors"
            >
              📱 დაგვიკავშირდით Telegram-ზე
            </a>
            <a 
              href="mailto:support@yourapp.ge"
              className="block w-full bg-white hover:bg-purple-50 border-2 border-purple-200 text-purple-700 py-2 px-3 rounded-xl text-xs font-medium text-center transition-colors"
            >
              ✉️ გამოგვიგზავნეთ Email
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
