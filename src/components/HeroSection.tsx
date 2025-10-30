import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ShoppingBag, Footprints } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface HeroSectionProps {
  onFindPicksClick: () => void;
}

export default function HeroSection({ onFindPicksClick }: HeroSectionProps) {
  const { t } = useI18n();

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#E8F9F4] via-white to-[#F0FEFB] py-16 md:py-20">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .hero-title {
          animation: fadeInUp 0.8s ease-out;
        }

        .hero-subtitle {
          animation: fadeInUp 1s ease-out 0.2s both;
        }

        .hero-cta {
          animation: fadeInUp 1.2s ease-out 0.4s both;
        }

        .hero-steps {
          animation: fadeInUp 1.4s ease-out 0.6s both;
        }

        .mint-blur {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(76, 201, 168, 0.15), transparent 70%);
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 0;
        }

        .find-smart-btn {
          animation: breathe 3s ease-in-out infinite;
          background: linear-gradient(90deg, #4CC9A8, #3FB08F);
          background-size: 200% auto;
          position: relative;
          overflow: hidden;
        }

        .find-smart-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }

        .find-smart-btn:hover::before {
          left: 100%;
        }

        .btn-glow {
          position: absolute;
          inset: -2px;
          background: radial-gradient(circle, rgba(76, 201, 168, 0.4), transparent 70%);
          border-radius: 1rem;
          filter: blur(12px);
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
          animation: pulseGlow 2.5s ease-in-out infinite;
        }

        .find-smart-btn:hover + .btn-glow,
        .find-smart-btn:focus + .btn-glow {
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-title,
          .hero-subtitle,
          .hero-cta,
          .hero-steps,
          .find-smart-btn,
          .btn-glow {
            animation: none !important;
          }
        }
      `}</style>

      {/* Decorative mint blur */}
      <div className="mint-blur" />

      {/* Main Hero Content */}
      <div className="relative z-10 text-center px-4 mb-16 md:mb-20">
        {/* Title */}
        <h1 className="hero-title text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-4 md:mb-6 tracking-tight">
          SmartPick
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-600 font-light mb-10 md:mb-12">
          where freshness meets timing.
        </p>

        {/* CTA Button */}
        <div className="hero-cta relative inline-block">
          <div className="relative">
            <Button
              size="lg"
              className="find-smart-btn text-white rounded-2xl font-bold text-base md:text-lg shadow-[0_8px_24px_rgba(76,201,168,0.4)] hover:shadow-[0_12px_32px_rgba(76,201,168,0.5)] transition-all duration-300 px-8 md:px-12 py-6 md:py-7 border-0"
              onClick={onFindPicksClick}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
                <span className="tracking-wide">{t('hero.findButton')}</span>
              </span>
            </Button>
            <div className="btn-glow" />
          </div>
        </div>
      </div>

      {/* How It Works - Integrated (No Title) */}
      <div className="hero-steps relative z-10 w-full max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Step 1: Find Nearby Offers */}
          <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100/50 hover:-translate-y-1 group">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#4CC9A8] to-[#3FB08F] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5 font-bold text-xl md:text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                {t('howItWorks.step1.title')}
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4 text-[#4CC9A8] flex-shrink-0" />
                <span>{t('howItWorks.step1.description')}</span>
              </p>
            </CardContent>
          </Card>

          {/* Step 2: Reserve Your Pick */}
          <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100/50 hover:-translate-y-1 group">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#4CC9A8] to-[#3FB08F] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5 font-bold text-xl md:text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                {t('howItWorks.step2.title')}
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed flex items-center justify-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#4CC9A8] flex-shrink-0" />
                <span>{t('howItWorks.step2.description')}</span>
              </p>
            </CardContent>
          </Card>

          {/* Step 3: Walk, Pick, Enjoy */}
          <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100/50 hover:-translate-y-1 group">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#FF6F61] to-[#ff5545] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5 font-bold text-xl md:text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                {t('howItWorks.step3.title')}
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed flex items-center justify-center gap-2">
                <Footprints className="w-4 h-4 text-[#FF6F61] flex-shrink-0" />
                <span>{t('howItWorks.step3.description')}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
