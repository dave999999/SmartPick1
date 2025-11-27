import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CircleUser, Globe, LogIn, LogOut, User, Star, Heart, PanelsTopLeft, ShieldCheck, Languages, FileText, Shield, Mail } from 'lucide-react';
import AuthDialog from '@/components/AuthDialog';
import { getCurrentUser, getPartnerByUserId, signOut } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export function TopRightMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useI18n();

  const [authOpen, setAuthOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signin');
  const [isOpen, setIsOpen] = useState(false);
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
  }, []);

  // Hide on partner dashboard - it has its own menu
  if (location.pathname === '/partner') {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsOpen(false);
    navigate('/');
  };

  const openAuth = (tab: 'signin' | 'signup') => {
    setAuthDefaultTab(tab);
    setAuthOpen(true);
    setIsOpen(false);
  };

  return (
  <div className="fixed top-3 right-3 md:top-4 md:right-4 z-[100] flex items-center gap-2">
      {/* Trigger */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-xl bg-white/90 dark:bg-black/70 backdrop-blur-md border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-black/80 transition-all active:scale-95"
            aria-label="Account menu"
          >
            <CircleUser className="h-5 w-5 text-gray-700 dark:text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          <DropdownMenuLabel className="text-gray-600">
            {user ? (user.name ? user.name : 'Account') : 'Welcome'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {user ? (
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/my-picks')}>
                <Star className="mr-2 h-4 w-4" /> {t('header.myPicks')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/favorites')}>
                <Heart className="mr-2 h-4 w-4" /> Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" /> {t('header.profile')}
              </DropdownMenuItem>
              {isPartnerApproved && (
                <DropdownMenuItem onClick={() => navigate('/partner')}>
                  <PanelsTopLeft className="mr-2 h-4 w-4" /> {t('header.partner')}
                </DropdownMenuItem>
              )}
              {user?.role === 'ADMIN' && (
                <DropdownMenuItem onClick={() => navigate('/admin-dashboard')}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> {t('header.admin')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!isPartnerApproved && (
                <DropdownMenuItem onClick={() => { navigate('/partner/apply'); setIsOpen(false); }}>
                  <PanelsTopLeft className="mr-2 h-4 w-4" /> {t('header.becomePartner')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" /> Language
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setLanguage('en')}>
                    🇬🇧 English {language === 'en' && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('ka')}>
                    🇬🇪 ქართული {language === 'ka' && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { navigate('/contact'); setIsOpen(false); }}>
                <Mail className="mr-2 h-4 w-4" /> Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/privacy'); setIsOpen(false); }}>
                <Shield className="mr-2 h-4 w-4" /> Privacy Policy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/terms'); setIsOpen(false); }}>
                <FileText className="mr-2 h-4 w-4" /> Terms & Conditions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-700">
                <LogOut className="mr-2 h-4 w-4" /> {t('header.signOut')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          ) : (
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openAuth('signin')}>
                <LogIn className="mr-2 h-4 w-4" /> {t('header.signIn')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAuth('signup')}>
                <User className="mr-2 h-4 w-4" /> Sign Up
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/partner/apply')}>
                <PanelsTopLeft className="mr-2 h-4 w-4" /> {t('header.becomePartner')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="mr-2 h-4 w-4" /> Language
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setLanguage('en')}>
                    🇬🇧 English {language === 'en' && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('ka')}>
                    🇬🇪 ქართული {language === 'ka' && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { navigate('/contact'); setIsOpen(false); }}>
                <Mail className="mr-2 h-4 w-4" /> Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/privacy'); setIsOpen(false); }}>
                <Shield className="mr-2 h-4 w-4" /> Privacy Policy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate('/terms'); setIsOpen(false); }}>
                <FileText className="mr-2 h-4 w-4" /> Terms & Conditions
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Auth dialog */}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authDefaultTab}
        onSuccess={async () => {
          // After auth success, refresh user and close menu
          const { user } = await getCurrentUser();
          setUser(user as any);
          if (user?.id) {
            const partner = await getPartnerByUserId(user.id);
            setIsPartnerApproved(!!partner && partner.status === 'APPROVED');
          }
        }}
      />
    </div>
  );
}

export default TopRightMenu;
