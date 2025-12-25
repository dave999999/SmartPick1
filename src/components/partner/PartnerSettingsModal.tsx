/**
 * PartnerSettingsModal - Settings and preferences for partners
 * 
 * Simplified version with only essential features:
 * - Security (Password change)
 * - Support/Help
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Shield, HelpCircle, ChevronRight, Bell,
  Settings as SettingsIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { PartnerNotificationSettings } from './PartnerNotificationSettings';

interface PartnerSettingsModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  userId: string; // Add userId prop
}

type SettingsSection = 
  | 'account' 
  | 'notifications'
  | 'support';

interface SectionConfig {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const sections: SectionConfig[] = [
  { id: 'notifications', label: 'შეტყობინებები', icon: Bell, color: 'from-purple-500 to-purple-600' },
  { id: 'account', label: 'უსაფრთხოება', icon: Shield, color: 'from-red-500 to-red-600' },
  { id: 'support', label: 'დახმარება', icon: HelpCircle, color: 'from-gray-500 to-gray-600' },
];

export function PartnerSettingsModal({ open, onClose, partnerId, userId }: PartnerSettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleChangePassword = () => {
    setShowPasswordDialog(true);
  };

  const handleTwoFactorAuth = () => {
    toast.info('ორფაქტორიანი ავთენტიფიკაცია მალე დაემატება', {
      description: 'დამატებითი უსაფრთხოების ფუნქცია მომდევნო განახლებაში'
    });
  };

  const handleDeleteAccount = () => {
    toast.error('ანგარიშის წაშლა', {
      description: 'ეს ფუნქცია მოითხოვს დამატებით დადასტურებას. გთხოვთ დაგვიკავშირდეთ მხარდაჭერის გუნდს.',
      duration: 5000
    });
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">უსაფრთხოება და ანგარიში</h3>
            
            <button 
              onClick={handleChangePassword}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all text-left flex items-center justify-between"
            >
              <div>
                <div className="font-medium">პაროლის შეცვლა</div>
                <div className="text-sm text-blue-100">განაახლეთ თქვენი პაროლი</div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>

            <button 
              onClick={handleTwoFactorAuth}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all text-left flex items-center justify-between"
            >
              <div>
                <div className="font-medium">ორფაქტორიანი ავთენტიფიკაცია</div>
                <div className="text-sm text-emerald-100">დამატებითი უსაფრთხოება</div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">საფრთხის ზონა</h4>
              <button 
                onClick={handleDeleteAccount}
                className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all text-left"
              >
                <div className="font-medium">ანგარიშის წაშლა</div>
                <div className="text-sm text-red-100 mt-1">
                  ანგარიშის წაშლა შეუქცევადია და წაშლის ყველა თქვენს მონაცემს
                </div>
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">შეტყობინებები</h3>
            <button 
              onClick={() => setShowNotifications(true)}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all text-left flex items-center justify-between"
            >
              <div>
                <div className="font-medium">შეტყობინებების პარამეტრები</div>
                <div className="text-sm text-purple-100">მართეთ შეტყობინებები და გაფრთხილებები</div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">დახმარება და მხარდაჭერა</h3>
            
            <button 
              onClick={() => toast.info('მხარდაჭერის გვერდი მალე დაემატება')}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">დაუკავშირდით მხარდაჭერას</div>
                <div className="text-sm text-gray-500">ჩვენ აქ ვართ დახმარებისთვის</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button 
              onClick={() => toast.info('ხშირი კითხვები მალე დაემატება')}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">ხშირად დასმული კითხვები</div>
                <div className="text-sm text-gray-500">პასუხები ყველაზე გავრცელებულ კითხვებზე</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button 
              onClick={() => toast.info('პრობლემის მოხსენების ფორმა მალე დაემატება')}
              className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-gray-900">პრობლემის მოხსენება</div>
                <div className="text-sm text-gray-500">გვითხარით რაიმე პრობლემის შესახებ</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-6">
              <div className="text-center">
                <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">SmartPick Partner</h4>
                <p className="text-sm text-gray-500">ვერსია 1.0.0</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-2 sm:inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl sm:rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[calc(100vh-16px)] sm:max-h-[calc(100vh-32px)]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 sm:px-6 py-3 sm:py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-base sm:text-xl font-bold">პარამეტრები</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-xl hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Sidebar - Always visible */}
              <div className="w-12 md:w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0">
                <div className="p-1 md:p-3 space-y-0.5 md:space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full px-1 py-2.5 md:px-4 md:py-3 rounded-lg md:rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start gap-0 md:gap-3 transition-all ${
                          isActive
                            ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="hidden md:block font-medium text-sm">{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderSectionContent()}
                </motion.div>
              </div>
            </div>

            {/* Footer - Simplified, no save button needed */}
            <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 flex justify-end flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors text-sm"
              >
                დახურვა
              </button>
            </div>
          </motion.div>
    
    {/* Notification Settings Dialog */}
    <PartnerNotificationSettings
      open={showNotifications}
      onOpenChange={setShowNotifications}
      partnerId={partnerId}
      userId={userId}
    />
        </>
      )}
    </AnimatePresence>

    {/* Password Change Dialog */}
    <ChangePasswordDialog
      open={showPasswordDialog}
      onOpenChange={setShowPasswordDialog}
    />
    </>
  );
}
