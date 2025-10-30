import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingBag, LogOut } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Header() {
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-mint-600" />
          <div>
            <Link to="/" className="text-lg font-bold text-gray-900">SmartPick</Link>
            <div className="text-xs text-gray-500">{t('header.tagline')}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden md:flex gap-3">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">{t('browse.smartPicks')}</Link>
            <Link to="/my-picks" className="text-sm text-gray-600 hover:text-gray-900">{t('header.myPicks')}</Link>
            <Link to="/partner" className="text-sm text-gray-600 hover:text-gray-900">{t('header.partner')}</Link>
            <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">{t('header.admin')}</Link>
          </nav>

          {/* Language switch */}
          <div className="flex items-center gap-2">
            <button
              aria-label="English"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded ${language === 'en' ? 'bg-gray-200' : 'bg-white'}`}
            >
              🇬🇧
            </button>
            <button
              aria-label="Georgian"
              onClick={() => setLanguage('ka')}
              className={`px-2 py-1 rounded ${language === 'ka' ? 'bg-gray-200' : 'bg-white'}`}
            >
              🇬🇪
            </button>
            <button
              aria-label="Russian"
              onClick={() => setLanguage('ru')}
              className={`px-2 py-1 rounded ${language === 'ru' ? 'bg-gray-200' : 'bg-white'}`}
            >
              🇷🇺
            </button>
          </div>

          <Button variant="outline" onClick={() => navigate('/')}>
            Customer View
          </Button>
        </div>
      </div>
    </header>
  );
}
