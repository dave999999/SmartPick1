import { useI18n } from '@/lib/i18n';

export default function Home() {
  const { t, setLanguage, language } = useI18n();
  return (
    <div className="text-center mt-10">
      <h1 className="text-3xl font-bold">{t('home.welcome')}</h1>
      <div className="mt-4 space-x-3" role="group" aria-label="Language selection">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 rounded ${language === 'en' ? 'bg-gray-300' : 'bg-gray-200'}`}
          aria-pressed={language === 'en'}
        >🇬🇧 English</button>
        <button
          onClick={() => setLanguage('ka')}
          className={`px-3 py-1 rounded ${language === 'ka' ? 'bg-gray-300' : 'bg-gray-200'}`}
          aria-pressed={language === 'ka'}
        >🇬🇪 ქართული</button>
      </div>
    </div>
  );
}
