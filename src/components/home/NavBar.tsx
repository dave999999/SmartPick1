import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, User, LogIn, LogOut, Shield, ShoppingBag, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { User as UserType } from '@/lib/types';

interface NavBarProps {
  user: UserType | null;
  isPartner: boolean;
  onSignOut: () => void;
  onAuthClick: () => void;
  onFilterClick: () => void;
}

export function NavBar({ user, isPartner, onSignOut, onAuthClick, onFilterClick }: NavBarProps) {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900/85 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img
            src="/icon1.png"
            alt="SmartPick"
            className="h-8 w-8 md:h-10 md:w-10 object-contain"
          />
          <div className="leading-tight hidden sm:block">
            <h1 className="text-lg md:text-xl font-extrabold bg-gradient-to-r from-[#00C896] to-[#009B77] text-transparent bg-clip-text">
              SmartPick
            </h1>
            <p className="text-[9px] md:text-[10px] text-gray-400">Smart choice every day</p>
          </div>
        </button>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            onClick={() => navigate('/partner/apply')}
            size="sm"
            className="rounded-full bg-gradient-to-r from-[#FF6F61] to-[#FF8A7A] hover:from-[#ff5545] hover:to-[#FF7565] text-white font-semibold shadow-md"
          >
            🤝 {t('header.becomePartner')}
          </Button>

          {/* Language Switcher */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                language === 'en'
                  ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
                  : 'bg-transparent text-gray-200 border-white/20 hover:bg-white/10'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ka')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                language === 'ka'
                  ? 'bg-white text-gray-900 border-gray-200 shadow-sm'
                  : 'bg-transparent text-gray-200 border-white/20 hover:bg-white/10'
              }`}
            >
              KA
            </button>
          </div>

          {/* Search/Filter Button */}
          <Button
            onClick={onFilterClick}
            size="icon"
            variant="outline"
            className="rounded-xl border-white/20 text-white hover:bg-white/10"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* User Actions */}
          {user ? (
            <>
              {user.role === 'ADMIN' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl bg-white/95 text-gray-900 border-gray-200 hover:bg-white"
                  onClick={() => navigate('/admin-dashboard')}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  {t('header.admin')}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl bg-white/95 text-gray-900 border-gray-200 hover:bg-white"
                onClick={() => navigate('/profile')}
              >
                <User className="w-4 h-4 mr-1" />
                {t('header.profile')}
              </Button>
              {isPartner && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl bg-white/95 text-gray-900 border-gray-200 hover:bg-white"
                  onClick={() => navigate('/partner')}
                >
                  {t('header.partner')}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl bg-white/95 text-gray-900 border-gray-200 hover:bg-white"
                onClick={onSignOut}
              >
                <LogOut className="w-4 h-4 mr-1" />
                {t('header.signOut')}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl bg-white/95 text-gray-900 border-gray-200 hover:bg-white"
              onClick={onAuthClick}
            >
              <LogIn className="w-4 h-4 mr-1" />
              {t('header.signIn')}
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            onClick={onFilterClick}
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 mt-6">
                {/* Language Buttons */}
                <div className="flex items-center gap-2 pb-3 border-b">
                  <span className="text-sm text-gray-500">Language:</span>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      language === 'en' ? 'bg-primary text-white' : 'bg-gray-100'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('ka')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      language === 'ka' ? 'bg-primary text-white' : 'bg-gray-100'
                    }`}
                  >
                    KA
                  </button>
                </div>

                <Button
                  onClick={() => {
                    navigate('/partner/apply');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start bg-gradient-to-r from-[#FF6F61] to-[#FF8A7A] text-white"
                >
                  🤝 {t('header.becomePartner')}
                </Button>

                {user ? (
                  <>
                    <div className="text-sm text-gray-600 pb-2 border-b">
                      Hello, {user.name}
                    </div>
                    {user.role === 'ADMIN' && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          navigate('/admin-dashboard');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {t('header.admin')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/profile');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {t('header.profile')}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/my-picks');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      {t('header.myPicks')}
                    </Button>
                    {isPartner && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          navigate('/partner');
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t('header.partner')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start mt-4 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        onSignOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('header.signOut')}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      onAuthClick();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {t('header.signIn')}
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
