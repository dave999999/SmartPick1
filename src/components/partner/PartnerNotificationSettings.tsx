/**
 * Partner Notification Settings Modal
 * 
 * Features:
 * - Critical notification toggles
 * - Telegram/SMS/Email channel management
 * - Protection for critical toggles
 * - Apple-style glassmorphism design
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { 
  X, 
  AlertCircle,
  Package,
  XCircle,
  MessageSquare,
  Smartphone,
  Mail,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { toast } from 'sonner';

export interface NotificationPreferences {
  // Critical Alerts
  newOrder: boolean;
  lowStock: boolean;
  cancellation: boolean;
  
  // Notification Channels
  telegram: boolean;
  sms: boolean;
  email: boolean;
}

interface PartnerNotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  userId: string;
  onDataRefresh?: () => void;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  newOrder: true,
  lowStock: true,
  cancellation: true,
  telegram: true,
  sms: false,
  email: false,
};

export function PartnerNotificationSettings({ 
  open, 
  onOpenChange,
  partnerId,
  userId,
  onDataRefresh,
}: PartnerNotificationSettingsProps) {
  const { t } = useI18n();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (open && partnerId) {
      loadPreferences();
    }
  }, [open, partnerId]);

  const loadPreferences = async () => {
    try {
      const { getPartnerNotificationSettings } = await import('@/lib/api/partners');
      const prefs = await getPartnerNotificationSettings(partnerId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast.error('პარამეტრების ჩატვირთვა ვერ მოხერხდა');
    }
  };

  const savePreferences = async (newPrefs: NotificationPreferences) => {
    setIsSaving(true);
    try {
      const { updatePartnerNotificationSettings } = await import('@/lib/api/partners');
      await updatePartnerNotificationSettings(partnerId, newPrefs);
      setPreferences(newPrefs);
      toast.success('პარამეტრები შენახულია');
    } catch (error) {
      toast.error('შენახვა ვერ მოხერხდა');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    
    // Special handling for Telegram toggle
    if (key === 'telegram' && !preferences.telegram) {
      // Opening Telegram to connect
      const { getTelegramBotLink } = await import('@/lib/telegram');
      const botLink = getTelegramBotLink(userId);
      window.open(botLink, '_blank');
      toast.success('📱 გახსენი ტელეგრამი და დააჭირე START', {
        description: 'შეტყობინებები გააქტიურდება დაკავშირების შემდეგ',
        duration: 8000,
      });
    }
    
    // Check if all critical toggles are being disabled
    const criticalKeys: (keyof NotificationPreferences)[] = ['newOrder', 'lowStock', 'cancellation'];
    const criticalEnabled = criticalKeys.filter(k => newPrefs[k]).length;
    
    if (criticalKeys.includes(key) && criticalEnabled === 0) {
      toast.error('მინიმუმ ერთი კრიტიკული შეტყობინება უნდა იყოს ჩართული');
      return;
    }
    
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const criticalKeys: (keyof NotificationPreferences)[] = ['newOrder', 'lowStock', 'cancellation'];
  const allCriticalDisabled = criticalKeys.every(k => !preferences[k]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-lg border-none bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <VisuallyHidden>
          <DialogTitle>{t('notifications.title')}</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">🔔 შეტყობინებების პარამეტრები</h2>
          <p className="text-blue-100 text-sm mt-1">აირჩიეთ რა განახლებების მიღება გსურთ</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Critical Warning */}
          {allCriticalDisabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-4 bg-red-50 border-2 border-red-300 rounded-xl p-3"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">კრიტიკული</p>
                  <p className="text-xs text-red-700 mt-1">მინიმუმ ერთი კრიტიკული შეტყობინება უნდა იყოს ჩართული</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Critical Section */}
          <div className="px-4 py-4">
            <div className="space-y-3">
              <ToggleItem
                icon={<Package className="w-5 h-5 text-emerald-600" />}
                label="ახალი შეკვეთა"
                helper="მომენტალური შეტყობინება ახალ რეზერვაციაზე"
                checked={preferences.newOrder}
                onChange={() => togglePreference('newOrder')}
                critical
              />
              <ToggleItem
                icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
                label="დაბალი მარაგი"
                helper="როდესაც შეთავაზებული პროდუქტის მარაგი იწურება"
                checked={preferences.lowStock}
                onChange={() => togglePreference('lowStock')}
                critical
              />
              <ToggleItem
                icon={<XCircle className="w-5 h-5 text-red-600" />}
                label="გაუქმება"
                helper="როცა მომხმარებელი აუქმებს ჯავშანს"
                checked={preferences.cancellation}
                onChange={() => togglePreference('cancellation')}
                critical
              />
            </div>
          </div>

          {/* Notification Channels */}
          <div className="px-4 py-4 border-t bg-gray-50">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">შეტყობინების არხები</h3>
              <p className="text-xs text-gray-500 mt-1">აირჩიეთ როგორ გსურთ შეტყობინებების მიღება</p>
            </div>
            <div className="space-y-3 mt-3">
              <ToggleItem
                icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
                label="ტელეგრამი"
                helper="მომენტალური შეტყობინებები ტელეგრამ ბოტის მეშვეობით"
                checked={preferences.telegram}
                onChange={() => togglePreference('telegram')}
              />
              <ToggleItem
                icon={<Smartphone className="w-5 h-5 text-purple-600" />}
                label="SMS"
                helper="ტექსტური შეტყობინებები თქვენს ტელეფონზე"
                checked={preferences.sms}
                onChange={() => togglePreference('sms')}
                disabled
                comingSoon
              />
              <ToggleItem
                icon={<Mail className="w-5 h-5 text-teal-600" />}
                label="ელფოსტა"
                helper="შეტყობინებები თქვენს რეგისტრირებულ ელფოსტაზე"
                checked={preferences.email}
                onChange={() => togglePreference('email')}
                disabled
                comingSoon
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Preset Button Component
function PresetButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
        active
          ? 'bg-white text-blue-600 shadow-md'
          : 'bg-white/50 text-gray-600 hover:bg-white/80'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Section Header Component
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
  );
}

// Toggle Item Component
function ToggleItem({ 
  icon, 
  label, 
  helper, 
  checked, 
  onChange,
  critical = false,
  disabled = false,
  comingSoon = false
}: { 
  icon: React.ReactNode; 
  label: string; 
  helper: string; 
  checked: boolean; 
  onChange: () => void;
  critical?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${
      disabled 
        ? 'bg-gray-50 border-gray-200 opacity-60' 
        : critical && checked 
        ? 'bg-emerald-50/50 border-emerald-200' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 text-sm">{label}</p>
          {comingSoon && (
            <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-bold">
              მალე
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-0.5">{helper}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={critical && checked ? 'data-[state=checked]:bg-emerald-500' : ''}
      />
    </div>
  );
}
