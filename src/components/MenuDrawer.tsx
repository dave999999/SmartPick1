/**
 * MenuDrawer - Premium Apple-style glass morphism menu
 * Features: Translucent glass panels, cosmic-orange accents, smooth animations
 * Design: Matches transparent Offers Sheet with frosted glass aesthetic
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock, Heart, User, PanelsTopLeft, ShieldCheck, Languages, FileText, Shield, Mail, LogOut, Gift, Sparkles, ChevronRight } from 'lucide-react';
import { getCurrentUser, getPartnerByUserId, signOut } from '@/lib/api';
import { getUserPoints } from '@/lib/smartpoints-api';
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
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    const init = async () => {
      const { user } = await getCurrentUser();
      setUser(user as any);
      if (user?.id) {
        const partner = await getPartnerByUserId(user.id);
        setIsPartnerApproved(!!partner && partner.status === 'APPROVED');
        
        // Fetch actual user points
        const points = await getUserPoints(user.id);
        setUserPoints(points?.balance || 0);
      }
      setLoading(false);
    };
    init();
  }, [open]);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setUserPoints(0);
    onClose();
    navigate('/');
  };

  const openAuth = (tab: 'signin' | 'signup') => {
    // Set auth state first
    setAuthDefaultTab(tab);
    setAuthOpen(true);
    // Close menu immediately - auth dialog will appear on top with higher z-index
    onClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Auth dialog - rendered outside menu so it persists when menu closes */}
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
            
            // Fetch user points after sign in
            const points = await getUserPoints(user.id);
            setUserPoints(points?.balance || 0);
          }
        }}
      />

      {/* Menu Drawer - only render when open */}
      {open && (
        <>
          {/* Premium Backdrop with Blur */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] animate-in fade-in duration-[180ms]"
            onClick={onClose}
            style={{
              animation: 'fadeInBackdrop 180ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          />

      {/* Premium Glass Morphism Drawer */}
      <div 
        className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto"
        style={{
          animation: 'slideUpSpring 180ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Floating Glass Panel Container */}
        <div className="mx-3 mb-3">
          {/* Main Glass Panel */}
          <div 
            className="relative rounded-[32px] shadow-[0_4px_32px_rgba(0,0,0,0.12)] overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.45), rgba(255,255,255,0.18))',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
            }}
          >
            {/* Top Edge Gloss */}
            <div 
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }}
            />
            {/* Premium Glass Header */}
            <div className="sticky top-0 px-5 pt-5 pb-4 z-10">
              <div className="flex items-center justify-between">
                {user ? (
                  <div className="flex items-center gap-3">
                    {/* Glass Avatar with Glow */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,140,0,0.9), rgba(255,107,0,0.9))',
                        boxShadow: '0 4px 16px rgba(255,140,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                      }}
                    >
                      {(user.name || 'D')[0].toUpperCase()}
                      {/* Subtle outer glow */}
                      <div className="absolute inset-0 rounded-full animate-pulse-slow"
                        style={{
                          background: 'radial-gradient(circle, rgba(255,140,0,0.3), transparent 70%)',
                          filter: 'blur(8px)',
                          zIndex: -1,
                        }}
                      />
                    </div>
                    
                    {/* User Info - SF Pro Style */}
                    <div>
                      <h3 className="text-base font-medium text-gray-800 tracking-tight" style={{ fontWeight: 500 }}>
                        {user.name || 'dave'}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isPartnerApproved && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(255,107,0,0.15))',
                              color: '#FF8A00',
                              border: '1px solid rgba(255,140,0,0.3)',
                            }}
                          >
                            Partner
                          </span>
                        )}
                        <span className="text-xs text-gray-600 flex items-center gap-1 font-medium">
                          <Sparkles className="w-3 h-3 text-[#FF8A00]" />
                          <span className="font-semibold">{userPoints.toLocaleString()} SP</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Glass Avatar */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
                      }}
                    >
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-800 tracking-tight" style={{ fontWeight: 500 }}>
                        Menu
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Sign in to continue</p>
                    </div>
                  </div>
                )}
                
                {/* Frosted Close Button */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.4)';
                  }}
                >
                  <X className="w-4 h-4 text-gray-600" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Premium Glass Content */}
            <div className="px-4 pb-4 space-y-2.5">
              {user ? (
                <>
                  {/* Section 1: Quick Actions - Glass Tiles */}
                  <div className="space-y-2">
                    <GlassMenuItem
                      icon={Clock}
                      label="My Reservations"
                      onClick={() => handleNavigation('/my-picks')}
                    />
                    <GlassMenuItem
                      icon={Heart}
                      label="Favorites"
                      onClick={() => handleNavigation('/favorites')}
                    />
                    <GlassMenuItem
                      icon={User}
                      label="Profile"
                      onClick={() => handleNavigation('/profile')}
                    />
                    {isPartnerApproved && (
                      <GlassMenuItem
                        icon={PanelsTopLeft}
                        label="Partner Dashboard"
                        onClick={() => handleNavigation('/partner')}
                      />
                    )}
                    {user?.role === 'ADMIN' && (
                      <GlassMenuItem
                        icon={ShieldCheck}
                        label="Admin Panel"
                        onClick={() => handleNavigation('/admin-dashboard')}
                      />
                    )}
                  </div>

                  {/* Language Selector - Glass Tile */}
                  <div 
                    className="rounded-[18px] p-3.5 backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Languages className="w-4 h-4 text-gray-600" strokeWidth={2} />
                        <span className="text-sm font-medium text-gray-700">Language</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setLanguage('en')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            language === 'en'
                              ? 'bg-gradient-to-br from-[#FF8A00] to-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,140,0,0.4)]'
                              : 'bg-white/60 text-gray-600 hover:bg-white/80'
                          }`}
                        >
                          EN
                        </button>
                        <button
                          onClick={() => setLanguage('ka')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            language === 'ka'
                              ? 'bg-gradient-to-br from-[#FF8A00] to-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,140,0,0.4)]'
                              : 'bg-white/60 text-gray-600 hover:bg-white/80'
                          }`}
                        >
                          KA
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* App Settings Glass Tiles */}
                  <GlassMenuItem
                    icon={Mail}
                    label="Contact Support"
                    onClick={() => handleNavigation('/contact')}
                  />
                  <GlassMenuItem
                    icon={Shield}
                    label="Privacy Policy"
                    onClick={() => handleNavigation('/privacy')}
                  />
                  <GlassMenuItem
                    icon={FileText}
                    label="Terms & Conditions"
                    onClick={() => handleNavigation('/terms')}
                  />

                  {/* Cosmic Orange Glass CTA - Invite Friends */}
                  <div 
                    className="rounded-[20px] p-4 relative overflow-hidden backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,140,0,0.55), rgba(255,110,0,0.35))',
                      boxShadow: '0 4px 20px rgba(255,140,0,0.25), 0 0 0 1px rgba(255,140,0,0.2)',
                    }}
                  >
                    <button
                      onClick={() => handleNavigation('/profile')}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                            style={{
                              background: 'rgba(255,255,255,0.25)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)',
                            }}
                          >
                            <Gift className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">Invite friends</p>
                            <p className="text-white/95 text-xs font-medium">Earn 50 SmartPoints ⭐</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/80" strokeWidth={2} />
                      </div>
                    </button>
                    {/* Soft glow effect */}
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15), transparent 60%)',
                      }}
                    />
                  </div>

                  {/* Become Partner CTA (if not partner) */}
                  {!isPartnerApproved && (
                    <GlassMenuItem
                      icon={PanelsTopLeft}
                      label="Become a Partner"
                      subtitle="List your business"
                      onClick={() => handleNavigation('/partner/apply')}
                      accent
                    />
                  )}

                  {/* Sign Out - Glass Danger Button */}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-[18px] font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))',
                      color: '#dc2626',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.1)',
                    }}
                  >
                    <LogOut className="w-4 h-4" strokeWidth={2} />
                    <span>{t('header.signOut')}</span>
                  </button>
            </>
              ) : (
                <>
                  {/* Premium Cosmic-Orange Glass CTA - Guest User */}
                  <div 
                    className="rounded-[24px] p-6 text-center relative overflow-hidden backdrop-blur-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,140,0,0.55), rgba(255,110,0,0.35))',
                      boxShadow: '0 8px 32px rgba(255,140,0,0.3), 0 0 0 1px rgba(255,140,0,0.2)',
                    }}
                  >
                    {/* Cosmic sparkle icon */}
                    <div className="relative inline-block mb-3">
                      <Sparkles className="w-14 h-14 text-white relative z-10" strokeWidth={2} />
                      <div 
                        className="absolute inset-0 animate-pulse-slow"
                        style={{
                          background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)',
                          filter: 'blur(12px)',
                        }}
                      />
                    </div>

                    <h3 className="text-white font-bold text-lg mb-1.5 tracking-tight" style={{ fontWeight: 600 }}>
                      Join SmartPick
                    </h3>
                    <p className="text-white/95 text-sm mb-5 font-medium">
                      Get exclusive deals and earn SmartPoints
                    </p>

                    {/* Primary Glass Button - Sign In */}
                    <button
                      onClick={() => openAuth('signin')}
                      className="w-full font-semibold py-3 rounded-[16px] mb-2.5 transition-all active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
                        color: '#FF8A00',
                        boxShadow: '0 4px 16px rgba(255,140,0,0.25), 0 0 0 1px rgba(255,140,0,0.15)',
                        animation: 'subtleBounce 2s ease-in-out infinite',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,140,0,0.35), 0 0 0 1px rgba(255,140,0,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,140,0,0.25), 0 0 0 1px rgba(255,140,0,0.15)';
                      }}
                    >
                      Sign In
                    </button>

                    {/* Secondary Glass Outline Button */}
                    <button
                      onClick={() => openAuth('signup')}
                      className="w-full font-semibold py-3 rounded-[16px] transition-all backdrop-blur-md"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        border: '1.5px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      }}
                    >
                      Create Account
                    </button>

                    {/* Soft glow overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.2), transparent 60%)',
                      }}
                    />
                  </div>

                  {/* Become Partner Glass Tile */}
                  <GlassMenuItem
                    icon={PanelsTopLeft}
                    label="Become a Partner"
                    subtitle="List your business"
                    onClick={() => handleNavigation('/partner/apply')}
                    accent
                  />

                  {/* Language Selector - Glass Tile */}
                  <div 
                    className="rounded-[18px] p-3.5 backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Languages className="w-4 h-4 text-gray-600" strokeWidth={2} />
                        <span className="text-sm font-medium text-gray-700">Language</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setLanguage('en')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            language === 'en'
                              ? 'bg-gradient-to-br from-[#FF8A00] to-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,140,0,0.4)]'
                              : 'bg-white/60 text-gray-600 hover:bg-white/80'
                          }`}
                        >
                          EN
                        </button>
                        <button
                          onClick={() => setLanguage('ka')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            language === 'ka'
                              ? 'bg-gradient-to-br from-[#FF8A00] to-[#FF6B00] text-white shadow-[0_0_12px_rgba(255,140,0,0.4)]'
                              : 'bg-white/60 text-gray-600 hover:bg-white/80'
                          }`}
                        >
                          KA
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* App Links Glass Tiles */}
                  <GlassMenuItem
                    icon={Mail}
                    label="Contact Support"
                    onClick={() => handleNavigation('/contact')}
                  />
                  <GlassMenuItem
                    icon={Shield}
                    label="Privacy Policy"
                    onClick={() => handleNavigation('/privacy')}
                  />
                  <GlassMenuItem
                    icon={FileText}
                    label="Terms & Conditions"
                    onClick={() => handleNavigation('/terms')}
                  />
                </>
              )}
            </div>

            {/* Bottom Safe Area Padding */}
            <div className="h-3" />
          </div>
        </div>
      </div>
        </>
      )}
    </>
  );
}

// Premium Glass Menu Item Component - iOS Style
interface GlassMenuItemProps {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  onClick: () => void;
  accent?: boolean;
}

function GlassMenuItem({ icon: Icon, label, subtitle, onClick, accent = false }: GlassMenuItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full rounded-[18px] p-3.5 backdrop-blur-sm transition-all"
      style={{
        background: isHovered 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.5))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))',
        boxShadow: isHovered
          ? '0 4px 16px rgba(0,0,0,0.08)'
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon 
            className={`w-4 h-4 transition-colors ${accent ? 'text-[#FF8A00]' : 'text-gray-600'}`}
            strokeWidth={2}
          />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">{label}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronRight 
          className={`w-4 h-4 transition-all ${isHovered ? 'translate-x-0.5 text-gray-600' : 'text-gray-400'}`}
          strokeWidth={2}
        />
      </div>
    </button>
  );
}

// Add keyframes for subtle bounce animation
const style = document.createElement('style');
style.textContent = `
  @keyframes subtleBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  
  @keyframes fadeInBackdrop {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUpSpring {
    from { 
      opacity: 0;
      transform: translateY(100px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.9; }
  }

  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }
`;
document.head.appendChild(style);
