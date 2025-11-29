/**
 * MenuDrawer - Compact, friendly, mobile-optimized drawer with personality
 * Features: User avatar, SmartPoints, grouped sections, gamification
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock, Heart, User, PanelsTopLeft, ShieldCheck, Languages, FileText, Shield, Mail, LogOut, LogIn, Gift, Sparkles } from 'lucide-react';
import { getCurrentUser, getPartnerByUserId, signOut } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import AuthDialog from '@/components/AuthDialog';

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useI18n();

  const [authOpen, setAuthOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<null | { id: string; role?: string; name?: string }>(null);
  const [isPartnerApproved, setIsPartnerApproved] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { user } = await getCurrentUser();
      setUser(user as any);
      if (user?.id) {
        const partner = await getPartnerByUserId(user.id);
        setIsPartnerApproved(!!partner && partner.status === 'APPROVED');
      }
      setLoading(false);
    };
    init();
  }, [open]);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    onClose();
    navigate('/');
  };

  const openAuth = (tab: 'signin' | 'signup') => {
    setAuthDefaultTab(tab);
    setAuthOpen(true);
    onClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer - Ultra Compact & Friendly Design */}
      <div className="fixed inset-x-0 bottom-0 z-[70] bg-gradient-to-b from-white to-gray-50 dark:from-sp-surface1 dark:to-sp-bg rounded-t-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
        {/* User Header - Avatar + SmartPoints */}
        <div className="sticky top-0 bg-gradient-to-r from-[#C9F9E9]/20 to-[#FF8A00]/10 dark:from-sp-surface2 dark:to-sp-surface1 backdrop-blur-xl border-b border-gray-200/50 dark:border-sp-border-soft px-5 py-4 rounded-t-[28px]">
          <div className="flex items-center justify-between">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF6B00] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {(user.name || 'D')[0].toUpperCase()}
                </div>
                
                {/* User Info */}
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-sp-text-primary">
                    {user.name || 'dave'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {isPartnerApproved && (
                      <span className="text-[10px] px-2 py-0.5 bg-[#FF8A00] text-white rounded-full font-semibold">
                        Partner
                      </span>
                    )}
                    <span className="text-xs text-gray-600 dark:text-sp-text-muted flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#FF8A00]" />
                      <span className="font-semibold">955 SP</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-sp-surface2 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400 dark:text-sp-text-muted" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-sp-text-primary">Menu</h3>
                  <p className="text-xs text-gray-500 dark:text-sp-text-muted">Sign in to continue</p>
                </div>
              </div>
            )}
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/60 dark:hover:bg-sp-surface2 rounded-full transition-all"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-sp-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content - Grouped Cards */}
        <div className="px-4 py-4 space-y-3">
          {user ? (
            <>
              {/* Section 1: Quick Actions */}
              <div className="bg-white dark:bg-sp-surface1 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-sp-border-soft">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-sp-text-muted uppercase tracking-wide px-2 mb-2">
                  Quick Actions
                </h4>
                <div className="space-y-0.5">
                  <QuickMenuItem
                    icon={Clock}
                    label="My Reservations"
                    onClick={() => handleNavigation('/my-picks')}
                  />
                  <QuickMenuItem
                    icon={Heart}
                    label="Favorites"
                    onClick={() => handleNavigation('/favorites')}
                  />
                  <QuickMenuItem
                    icon={User}
                    label="Profile"
                    onClick={() => handleNavigation('/profile')}
                  />
                  {isPartnerApproved && (
                    <QuickMenuItem
                      icon={PanelsTopLeft}
                      label="Partner Dashboard"
                      onClick={() => handleNavigation('/partner')}
                    />
                  )}
                  {user?.role === 'ADMIN' && (
                    <QuickMenuItem
                      icon={ShieldCheck}
                      label="Admin Panel"
                      onClick={() => handleNavigation('/admin-dashboard')}
                    />
                  )}
                </div>
              </div>

              {/* Section 2: App Settings */}
              <div className="bg-white dark:bg-sp-surface1 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-sp-border-soft">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-sp-text-muted uppercase tracking-wide px-2 mb-2">
                  App Settings
                </h4>
                <div className="space-y-0.5">
                  {/* Language Selector */}
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-gray-600 dark:text-sp-text-secondary" />
                      <span className="text-sm font-medium text-gray-700 dark:text-sp-text-secondary">Language</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setLanguage('en')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          language === 'en'
                            ? 'bg-[#FF8A00] text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-sp-surface2 text-gray-600 dark:text-sp-text-muted hover:bg-gray-200 dark:hover:bg-sp-surface2/60'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setLanguage('ka')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          language === 'ka'
                            ? 'bg-[#FF8A00] text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-sp-surface2 text-gray-600 dark:text-sp-text-muted hover:bg-gray-200 dark:hover:bg-sp-surface2/60'
                        }`}
                      >
                        KA
                      </button>
                    </div>
                  </div>
                  
                  <QuickMenuItem
                    icon={Mail}
                    label="Contact Support"
                    onClick={() => handleNavigation('/contact')}
                  />
                  <QuickMenuItem
                    icon={Shield}
                    label="Privacy Policy"
                    onClick={() => handleNavigation('/privacy')}
                  />
                  <QuickMenuItem
                    icon={FileText}
                    label="Terms & Conditions"
                    onClick={() => handleNavigation('/terms')}
                  />
                </div>
              </div>

              {/* Section 3: Gamification - Invite Friends */}
              <div className="bg-gradient-to-r from-[#FF8A00] to-[#FF6B00] rounded-2xl p-4 shadow-lg">
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Invite friends</p>
                        <p className="text-white/90 text-xs">Earn 50 SmartPoints ⭐</p>
                      </div>
                    </div>
                    <div className="text-white/80">→</div>
                  </div>
                </button>
              </div>

              {/* Become Partner CTA (if not partner) */}
              {!isPartnerApproved && (
                <div className="bg-gradient-to-r from-[#C9F9E9] to-[#A8F0DD] dark:from-sp-surface2 dark:to-sp-surface1 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-sp-border-soft">
                  <button
                    onClick={() => handleNavigation('/partner/apply')}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF8A00]/10 dark:bg-[#FF8A00]/20 rounded-full flex items-center justify-center">
                          <PanelsTopLeft className="w-5 h-5 text-[#FF8A00]" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-sp-text-primary font-semibold text-sm">Become a Partner</p>
                          <p className="text-gray-600 dark:text-sp-text-muted text-xs">List your business</p>
                        </div>
                      </div>
                      <div className="text-[#FF8A00]">→</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Danger Zone: Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-500 font-semibold hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('header.signOut')}</span>
              </button>
            </>
          ) : (
            <>
              {/* Guest User - Sign In CTA */}
              <div className="bg-gradient-to-r from-[#FF8A00] to-[#FF6B00] rounded-2xl p-6 shadow-lg text-center">
                <Sparkles className="w-12 h-12 text-white mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg mb-2">Join SmartPick</h3>
                <p className="text-white/90 text-sm mb-4">Get exclusive deals and earn SmartPoints</p>
                <button
                  onClick={() => openAuth('signin')}
                  className="w-full bg-white text-[#FF8A00] font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth('signup')}
                  className="w-full bg-white/10 backdrop-blur-sm text-white font-semibold py-2.5 rounded-xl hover:bg-white/20 transition-colors mt-2"
                >
                  Create Account
                </button>
              </div>

              {/* Become Partner */}
              <div className="bg-white dark:bg-sp-surface1 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-sp-border-soft">
                <button
                  onClick={() => handleNavigation('/partner/apply')}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FF8A00]/10 rounded-full flex items-center justify-center">
                        <PanelsTopLeft className="w-5 h-5 text-[#FF8A00]" />
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-sp-text-primary font-semibold text-sm">Become a Partner</p>
                        <p className="text-gray-600 dark:text-sp-text-muted text-xs">List your business</p>
                      </div>
                    </div>
                    <div className="text-[#FF8A00]">→</div>
                  </div>
                </button>
              </div>

              {/* App Settings for Guest */}
              <div className="bg-white dark:bg-sp-surface1 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-sp-border-soft">
                <div className="space-y-0.5">
                  {/* Language Selector */}
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-gray-600 dark:text-sp-text-secondary" />
                      <span className="text-sm font-medium text-gray-700 dark:text-sp-text-secondary">Language</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setLanguage('en')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          language === 'en'
                            ? 'bg-[#FF8A00] text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-sp-surface2 text-gray-600 dark:text-sp-text-muted hover:bg-gray-200'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setLanguage('ka')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          language === 'ka'
                            ? 'bg-[#FF8A00] text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-sp-surface2 text-gray-600 dark:text-sp-text-muted hover:bg-gray-200'
                        }`}
                      >
                        KA
                      </button>
                    </div>
                  </div>
                  
                  <QuickMenuItem
                    icon={Mail}
                    label="Contact Support"
                    onClick={() => handleNavigation('/contact')}
                  />
                  <QuickMenuItem
                    icon={Shield}
                    label="Privacy Policy"
                    onClick={() => handleNavigation('/privacy')}
                  />
                  <QuickMenuItem
                    icon={FileText}
                    label="Terms & Conditions"
                    onClick={() => handleNavigation('/terms')}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-2" />
      </div>

      {/* Auth dialog */}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authDefaultTab}
        onSuccess={async () => {
          const { user } = await getCurrentUser();
          setUser(user as any);
          if (user?.id) {
            const partner = await getPartnerByUserId(user.id);
            setIsPartnerApproved(!!partner && partner.status === 'APPROVED');
          }
        }}
      />
    </>
  );
}

// Quick Menu Item Component - Compact & Clean
interface QuickMenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

function QuickMenuItem({ icon: Icon, label, onClick }: QuickMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-full flex items-center gap-2.5 px-2 py-2 rounded-lg
        text-gray-700 dark:text-sp-text-secondary
        hover:bg-gray-100 dark:hover:bg-sp-surface2
        transition-colors duration-200
        group
      "
    >
      <Icon className="w-4 h-4 text-gray-600 dark:text-sp-text-muted group-hover:text-[#FF8A00] transition-colors" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
