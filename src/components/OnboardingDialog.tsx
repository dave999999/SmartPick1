/**
 * Onboarding Bottom Sheet - Apple-quality glassmorphism design
 * Premium iOS-inspired onboarding with frosted glass effect
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Leaf, QrCode, Gift, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

interface OnboardingSlide {
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  descriptionKa: string;
  icon: React.ReactNode;
  gradient: string;
}

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  userName?: string;
  userId?: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    emoji: '🔭',
    title: 'Spot Hidden',
    subtitle: 'Gems',
    description: 'Explore the map to find exclusive deals near you',
    descriptionKa: 'იპოვეთ ექსკლუზიური შეთავაზებები თქვენს მახლობლად',
    icon: <img src="/icons/tut/1.png" alt="Map Discovery" className="h-48 w-48 object-contain drop-shadow-2xl" />,
    gradient: 'from-purple-500/10 via-pink-500/10 to-rose-500/10',
  },
  {
    emoji: '🎟️',
    title: 'Book Now',
    subtitle: 'Pay Later',
    description: 'Secure your offer in the app instantly. You only pay when arrive at offers location',
    descriptionKa: 'დაჯავშნეთ შეთავაზება აპლიკაციაში. გადაიხადე დარეზერვებული ფასი ლოკაციაზე',
    icon: <img src="/icons/tut/2.png" alt="Book Offer" className="h-48 w-48 object-contain drop-shadow-2xl" />,
    gradient: 'from-blue-500/10 via-indigo-500/10 to-purple-500/10',
  },
  {
    emoji: '🎉',
    title: 'Simple',
    subtitle: 'Pickup',
    description: 'Just show your QR code at the counter to unlock your deal',
    descriptionKa: 'უბრალოდ აჩვენეთ QR კოდი ობიექტზე შეთავაზების გასანაღდებლად',
    icon: <img src="/icons/tut/3.png" alt="QR Pickup" className="h-48 w-48 object-contain drop-shadow-2xl" />,
    gradient: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
  },
];

export function OnboardingDialog({ open, onComplete, onDismiss, userName = 'there', userId }: OnboardingDialogProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { language } = useI18n();

  const slide = ONBOARDING_SLIDES[currentSlide];
  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;
  const progress = ((currentSlide + 1) / ONBOARDING_SLIDES.length) * 100;
  const description = language === 'ka' ? slide.descriptionKa : slide.description;
  
  // Translations
  const t = {
    welcome: language === 'ka' ? 'მოგესალმებით' : 'Welcome',
    starterBonus: language === 'ka' ? 'საწყისი ბონუსი' : 'Starter Bonus',
    points: language === 'ka' ? 'ქულა' : 'Points',
    readyToSpend: language === 'ka' ? 'მზად დახარჯვისთვის!' : 'Ready to spend!',
    startExploring: language === 'ka' ? 'დაიწყე აღმოჩენა' : 'Start Exploring',
    next: language === 'ka' ? 'შემდეგი →' : 'Next →',
    back: language === 'ka' ? '← უკან' : '← Back',
    dontShowAgain: language === 'ka' ? 'აღარ მაჩვენო' : "Don't show this again",
  };

  useEffect(() => {
    if (open) {
      setCurrentSlide(0);
      setDontShowAgain(false);
    }
  }, [open]);

  const handleNext = async () => {
    if (isLastSlide) {
      // Claim points and complete onboarding
      if (userId) {
        try {
          await supabase
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', userId);
          logger.info('Onboarding completed - user claimed welcome points');
          toast.success('🎉 100 SmartPoints added to your wallet!');
        } catch (err) {
          logger.error('Failed to mark onboarding as completed:', err);
        }
      }
      onComplete();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = async () => {
    // If "don't show again" is checked, mark onboarding as completed
    if (dontShowAgain && userId) {
      try {
        await supabase
          .from('users')
          .update({ onboarding_completed: true })
          .eq('id', userId);
        logger.info('Onboarding skipped permanently');
        toast.success('Tutorial dismissed. You can always access help from settings.');
      } catch (err) {
        logger.error('Failed to save onboarding preference:', err);
        toast.error('Failed to save preference');
      }
    }
    if (onDismiss) {
      onDismiss();
    } else {
      onComplete();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto">
      {/* Backdrop - iOS style dimming - Blocks all interactions */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/30"
            style={{ pointerEvents: 'all' }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          />
        )}
      </AnimatePresence>

      {/* Top Sheet - Apple Glass Material */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300,
              mass: 0.8 
            }}
            className="relative w-full max-w-lg mx-4 my-4 mb-28 z-[10000]"
            style={{ pointerEvents: 'all' }}
          >
            {/* Ultra-Premium Glassmorphism - iOS System Style */}
            <div className="relative bg-white/85 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40 overflow-hidden">
              {/* Subtle Gradient Tint */}
              <motion.div 
                className={cn(
                  "absolute inset-0 bg-gradient-to-br pointer-events-none",
                  slide.gradient
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />

              {/* Close Button - iOS Style */}
              <motion.button
                onClick={handleSkip}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-gray-100/80 backdrop-blur-md hover:bg-gray-200/90 transition-all duration-200 border border-white/60 shadow-lg"
                aria-label="Close tutorial"
              >
                <X className="h-4 w-4 text-gray-600" strokeWidth={2.5} />
              </motion.button>
              {/* Content Container */}
              <div className="relative px-6 py-5 pt-4">
                {/* Welcome Header - Apple Typography */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-4"
                >
                  <p className="text-xs font-semibold text-gray-500 mb-0.5 tracking-wide uppercase">
                    {t.welcome}, {userName}! 👋
                  </p>
                </motion.div>

                {/* Progress Dots */}
                <div className="flex justify-center gap-1.5 mb-5">
                  {ONBOARDING_SLIDES.map((_, index) => (
                    <motion.div
                      key={index}
                      initial={false}
                      animate={{
                        width: index === currentSlide ? 20 : 6,
                        backgroundColor: index === currentSlide 
                          ? 'rgb(59, 130, 246)' 
                          : index < currentSlide
                          ? 'rgb(147, 197, 253)'
                          : 'rgb(229, 231, 235)'
                      }}
                      transition={{ duration: 0.3 }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>

                {/* Slide Content with Animation */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    {/* Tutorial Image */}
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 12 }}
                      className="flex justify-center mb-5"
                    >
                      {slide.icon}
                    </motion.div>

                    {/* Description - Apple Medium Weight */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-500 font-medium text-sm leading-relaxed max-w-sm mx-auto mb-5"
                    >
                      {description}
                    </motion.p>

                    {/* Last Slide - Bonus Badge - Prize Reveal Animation */}
                    {isLastSlide && (
                      <motion.div
                        className="relative inline-block"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                      >
                        {/* Radial Light Burst Effect */}
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: [0, 0.6, 0],
                            scale: [0.8, 1.5, 2]
                          }}
                          transition={{ 
                            duration: 1.2,
                            delay: 0.3,
                            ease: "easeOut"
                          }}
                          style={{
                            background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(251,191,36,0) 70%)',
                            filter: 'blur(20px)'
                          }}
                        />
                        
                        {/* Sparkles Particles */}
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute"
                            initial={{ 
                              x: 0, 
                              y: 0, 
                              opacity: 0,
                              scale: 0
                            }}
                            animate={{ 
                              x: Math.cos((i * 60) * Math.PI / 180) * 60,
                              y: Math.sin((i * 60) * Math.PI / 180) * 60,
                              opacity: [0, 1, 0],
                              scale: [0, 1, 0.5]
                            }}
                            transition={{ 
                              duration: 1,
                              delay: 0.4 + (i * 0.05),
                              ease: "easeOut"
                            }}
                            style={{
                              left: '50%',
                              top: '50%',
                            }}
                          >
                            <Sparkles className="h-3 w-3 text-yellow-300" fill="currentColor" />
                          </motion.div>
                        ))}

                        {/* Prize Badge */}
                        <motion.div
                          initial={{ rotateY: -90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          transition={{ 
                            delay: 0.5, 
                            duration: 0.6,
                            type: 'spring',
                            stiffness: 100
                          }}
                          className="relative inline-flex flex-col items-center gap-0.5 px-6 py-3 bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 rounded-xl shadow-2xl text-white mt-1 overflow-hidden"
                        >
                          {/* Shimmer Effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                            initial={{ x: '-100%' }}
                            animate={{ x: '200%' }}
                            transition={{
                              duration: 1.5,
                              delay: 0.6,
                              ease: "easeInOut"
                            }}
                          />
                          
                          <motion.span 
                            className="text-xs font-medium opacity-90"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 0.9 }}
                            transition={{ delay: 0.7 }}
                          >
                            {t.starterBonus}
                          </motion.span>
                          
                          <motion.div 
                            className="flex items-center gap-1.5"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ 
                              delay: 0.8, 
                              type: 'spring',
                              stiffness: 300,
                              damping: 10
                            }}
                          >
                            <motion.div
                              animate={{ 
                                rotate: [0, -10, 10, -10, 0],
                                scale: [1, 1.2, 1]
                              }}
                              transition={{ 
                                delay: 0.9,
                                duration: 0.5
                              }}
                            >
                              <Sparkles className="h-5 w-5" fill="currentColor" />
                            </motion.div>
                            <motion.span 
                              className="text-xl font-black"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ 
                                delay: 0.85,
                                type: 'spring',
                                stiffness: 200
                              }}
                            >
                              100 {t.points}
                            </motion.span>
                          </motion.div>
                          
                          <motion.span 
                            className="text-[10px] opacity-75"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 0.75 }}
                            transition={{ delay: 0.95 }}
                          >
                            {t.readyToSpend}
                          </motion.span>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="space-y-3">
                  {/* Primary Action Button - Apple Style Press */}
                  <motion.button
                    onClick={handleNext}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "w-full py-3.5 rounded-xl font-semibold text-base shadow-lg active:shadow-md transition-all duration-150",
                      isLastSlide
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
                    )}
                  >
                    {isLastSlide ? (
                      <motion.span 
                        className="flex items-center justify-center gap-2"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Sparkles className="h-5 w-5" />
                        {t.startExploring}
                      </motion.span>
                    ) : (
                      t.next
                    )}
                  </motion.button>

                  {/* Back button for non-first slides */}
                  {currentSlide > 0 && (
                    <button
                      onClick={handleBack}
                      className="w-full py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 active:text-gray-950 transition-colors"
                    >
                      {t.back}
                    </button>
                  )}

                  {/* Don't Show Again Checkbox - Apple Font Weight */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Checkbox 
                      id="dont-show-again"
                      checked={dontShowAgain}
                      onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                      className="border-gray-400"
                    />
                    <label 
                      htmlFor="dont-show-again" 
                      className="text-sm font-medium text-gray-500 cursor-pointer select-none"
                    >
                      {t.dontShowAgain}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
