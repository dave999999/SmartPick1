/**
 * PartnerSettingsModal - Settings and preferences for partners
 * 
 * Apple-inspired design with tabbed navigation and glassmorphism.
 * Sections: Profile, Notifications, Payment, Offers, Account, Language, Support
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Bell, Wallet, Package, Shield, 
  Globe, HelpCircle, ChevronRight, Save,
  Clock, MapPin, Phone, Mail, Building,
  CreditCard, Settings as SettingsIcon
} from 'lucide-react';

interface PartnerSettingsModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
}

type SettingsSection = 
  | 'profile' 
  | 'notifications' 
  | 'payment' 
  | 'offers' 
  | 'account' 
  | 'language' 
  | 'support';

interface SectionConfig {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const sections: SectionConfig[] = [
  { id: 'profile', label: 'პროფილი', icon: User, color: 'from-blue-500 to-blue-600' },
  { id: 'notifications', label: 'შეტყობინებები', icon: Bell, color: 'from-purple-500 to-purple-600' },
  { id: 'payment', label: 'გადახდები', icon: Wallet, color: 'from-emerald-500 to-emerald-600' },
  { id: 'offers', label: 'შეთავაზებები', icon: Package, color: 'from-amber-500 to-amber-600' },
  { id: 'account', label: 'უსაფრთხოება', icon: Shield, color: 'from-red-500 to-red-600' },
  { id: 'language', label: 'ენა და დისპლეი', icon: Globe, color: 'from-indigo-500 to-indigo-600' },
  { id: 'support', label: 'დახმარება', icon: HelpCircle, color: 'from-gray-500 to-gray-600' },
];

export function PartnerSettingsModal({ open, onClose, partnerId }: PartnerSettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [businessHours, setBusinessHours] = useState('');

  // Notification state
  const [notifyReservations, setNotifyReservations] = useState(true);
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyLowBalance, setNotifyLowBalance] = useState(true);
  const [notifyExpiring, setNotifyExpiring] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(true);

  // Payment state
  const [bankAccount, setBankAccount] = useState('');
  const [payoutSchedule, setPayoutSchedule] = useState('weekly');

  // Offer defaults
  const [defaultDiscount, setDefaultDiscount] = useState('10');
  const [autoRelist, setAutoRelist] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState('7');
  const [maxReservations, setMaxReservations] = useState('50');

  // Language
  const [language, setLanguage] = useState('ka');

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Save settings to database
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">ბიზნეს ინფორმაცია</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 inline mr-2" />
                ბიზნესის სახელი
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="თქვენი ბიზნესის სახელი"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">აღწერა</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="მოკლე აღწერა თქვენი ბიზნესის შესახებ"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  ტელეფონი
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+995 XXX XX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  ელ-ფოსტა
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                მისამართი
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="ქალაქი, ქუჩა, შენობა"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                სამუშაო საათები
              </label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="ორშაბათი-პარასკევი 10:00-19:00"
              />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">შეტყობინებების პარამეტრები</h3>
            
            <ToggleSetting
              label="ახალი დაჯავშნები"
              description="მიიღეთ შეტყობინება ახალი რეზერვაციის დროს"
              checked={notifyReservations}
              onChange={setNotifyReservations}
            />

            <ToggleSetting
              label="გადახდები"
              description="შეტყობინება გადახდის მიღების დროს"
              checked={notifyPayments}
              onChange={setNotifyPayments}
            />

            <ToggleSetting
              label="დაბალი ბალანსი"
              description="გაფრთხილება ქულების ნაკლებობის შემთხვევაში"
              checked={notifyLowBalance}
              onChange={setNotifyLowBalance}
            />

            <ToggleSetting
              label="შეთავაზებების ვადა"
              description="შეტყობინება შეთავაზების ვადის ამოწურვის წინ"
              checked={notifyExpiring}
              onChange={setNotifyExpiring}
            />

            <ToggleSetting
              label="მომხმარებლის შეტყობინებები"
              description="შეტყობინებები მომხმარებლებისგან"
              checked={notifyMessages}
              onChange={setNotifyMessages}
            />
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">გადახდის პარამეტრები</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 inline mr-2" />
                საბანკო ანგარიში (IBAN)
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="GE00BG0000000000000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                გადახდის განრიგი
              </label>
              <select
                value={payoutSchedule}
                onChange={(e) => setPayoutSchedule(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
              >
                <option value="daily">ყოველდღიური</option>
                <option value="weekly">ყოველკვირეული</option>
                <option value="biweekly">ორ კვირაში ერთხელ</option>
                <option value="monthly">ყოველთვიური</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900">
                <strong>შენიშვნა:</strong> გადახდები ხდება ავტომატურად თქვენს მითითებულ ანგარიშზე შერჩეული განრიგის მიხედვით.
              </p>
            </div>
          </div>
        );

      case 'offers':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">შეთავაზებების ნაგულისხმევი პარამეტრები</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ნაგულისხმევი ფასდაკლება (%)
              </label>
              <input
                type="number"
                value={defaultDiscount}
                onChange={(e) => setDefaultDiscount(e.target.value)}
                min="1"
                max="99"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <ToggleSetting
              label="ავტომატური განახლება"
              description="შეთავაზების ავტომატური განახლება ვადის ამოწურვის შემდეგ"
              checked={autoRelist}
              onChange={setAutoRelist}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ნაგულისხმევი ხანგრძლივობა (დღეები)
              </label>
              <select
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white"
              >
                <option value="1">1 დღე</option>
                <option value="3">3 დღე</option>
                <option value="7">7 დღე</option>
                <option value="14">14 დღე</option>
                <option value="30">30 დღე</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                მაქსიმალური რეზერვაციები
              </label>
              <input
                type="number"
                value={maxReservations}
                onChange={(e) => setMaxReservations(e.target.value)}
                min="1"
                max="1000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">უსაფრთხოება და ანგარიში</h3>
            
            <button className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all text-left flex items-center justify-between">
              <div>
                <div className="font-medium">პაროლის შეცვლა</div>
                <div className="text-sm text-blue-100">განაახლეთ თქვენი პაროლი</div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>

            <button className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all text-left flex items-center justify-between">
              <div>
                <div className="font-medium">ორფაქტორიანი ავთენტიფიკაცია</div>
                <div className="text-sm text-emerald-100">დამატებითი უსაფრთხოება</div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">საფრთხის ზონა</h4>
              <button className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all text-left">
                <div className="font-medium">ანგარიშის წაშლა</div>
                <div className="text-sm text-red-100 mt-1">
                  ანგარიშის წაშლა შეუქცევადია და წაშლის ყველა თქვენს მონაცემს
                </div>
              </button>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">ენა და დისპლეი</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ინტერფეისის ენა</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
              >
                <option value="ka">ქართული</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ვალუტა</label>
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
              >
                <option value="GEL">ლარი (₾)</option>
                <option value="USD">დოლარი ($)</option>
                <option value="EUR">ევრო (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">თარიღის ფორმატი</label>
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">დახმარება და მხარდაჭერა</h3>
            
            <button className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">დაუკავშირდით მხარდაჭერას</div>
                <div className="text-sm text-gray-500">ჩვენ აქ ვართ დახმარებისთვის</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">ხშირად დასმული კითხვები</div>
                <div className="text-sm text-gray-500">პასუხები ყველაზე გავრცელებულ კითხვებზე</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button className="w-full px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between">
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
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">პარამეტრები</h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Sidebar - Desktop */}
              <div className="hidden md:block w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <div className="p-3 space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                          isActive
                            ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile section selector */}
              <div className="md:hidden w-full border-b border-gray-200 bg-gray-50 p-3">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
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

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                გაუქმება
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'შენახვა...' : 'შენახვა'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Toggle switch component
interface ToggleSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500 mt-1">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          checked ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-300'
        }`}
      >
        <motion.div
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
        />
      </button>
    </div>
  );
}
