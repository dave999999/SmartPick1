import { useI18n } from '@/lib/i18n';
import { Sparkles, Navigation, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { t, setLanguage, language } = useI18n();
  const navigate = useNavigate();

  return (
    <PageShell>
      <PageHeader
        title={
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Sparkles className="w-6 h-6 text-[#4CC9A8]" /> SmartPick
          </button>
        }
        right={
          <div className="flex items-center gap-2" role="group" aria-label="Language selection">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded text-sm ${language === 'en' ? 'bg-gray-200' : 'bg-white'}`}
              aria-pressed={language === 'en'}
            >EN</button>
            <button
              onClick={() => setLanguage('ka')}
              className={`px-3 py-1 rounded text-sm ${language === 'ka' ? 'bg-gray-200' : 'bg-white'}`}
              aria-pressed={language === 'ka'}
            >KA</button>
          </div>
        }
      />

      {/* Hero Section */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            {t('home.welcome')}
          </h1>
          <p className="mt-4 text-gray-600 text-lg">
            {t('home.subtitle')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              className="w-full sm:w-auto bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866] text-white px-6 py-3 rounded-full shadow-md"
              onClick={() => navigate('/')}
            >
              <Navigation className="w-4 h-4 mr-2" /> {t('home.exploreNearby')}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto rounded-full" onClick={() => navigate('/profile')}>
              {t('home.goToProfile')} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SectionCard title={t('home.value.save.title')} description={t('home.value.save.description')} accent="green">
          <p className="text-gray-700">{t('home.value.save.body')}</p>
        </SectionCard>
        <SectionCard title={t('home.value.points.title')} description={t('home.value.points.description')} accent="blue">
          <p className="text-gray-700">{t('home.value.points.body')}</p>
        </SectionCard>
        <SectionCard title={t('home.value.support.title')} description={t('home.value.support.description')} accent="orange">
          <p className="text-gray-700">{t('home.value.support.body')}</p>
        </SectionCard>
      </div>
    </PageShell>
  );
}
