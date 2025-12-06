/**
 * Bottom Navigation Demo Page
 * Showcases all three navigation variants side-by-side
 */

import { useState } from 'react';
import { BottomNavBar as BottomNavPremium, BottomNavStandard, BottomNavMinimal } from '@/components/navigation';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Variant = 'premium' | 'standard' | 'minimal';

export default function NavigationDemo() {
  const navigate = useNavigate();
  const [activeVariant, setActiveVariant] = useState<Variant>('premium');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Bottom Navigation
            </h1>
            <p className="text-xs text-gray-500">Three Premium Variants</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-32 px-4 max-w-md mx-auto">
        {/* Variant Selector */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-800 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Select Variant
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveVariant('premium')}
              className={`
                py-3 px-4 rounded-xl text-sm font-medium transition-all
                ${activeVariant === 'premium'
                  ? 'bg-[#FF7A00] text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              Premium
            </button>
            <button
              onClick={() => setActiveVariant('standard')}
              className={`
                py-3 px-4 rounded-xl text-sm font-medium transition-all
                ${activeVariant === 'standard'
                  ? 'bg-[#FF7A00] text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              Standard
            </button>
            <button
              onClick={() => setActiveVariant('minimal')}
              className={`
                py-3 px-4 rounded-xl text-sm font-medium transition-all
                ${activeVariant === 'minimal'
                  ? 'bg-[#FF7A00] text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              Minimal
            </button>
          </div>
        </div>

        {/* Variant Details */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
          {activeVariant === 'premium' && (
            <VariantDetails
              title="Premium iOS Glass"
              description="Maximum iOS aesthetic with frosted glass blur and ultra-premium feel."
              features={[
                'Glassmorphism backdrop-blur-[18px]',
                '60px floating center button with glow',
                'Spring-based micro-animations',
                'Ripple tap feedback',
                'Active pill background',
                'Perfect for flagship experience'
              ]}
              specs={{
                'Height': '72px',
                'Blur': '18px saturate(180%)',
                'Border Radius': '28px',
                'Center Button': '60px (-32px offset)',
                'Safe Area': '16px',
                'Shadow': '0 8px 32px rgba(0,0,0,0.12)'
              }}
            />
          )}

          {activeVariant === 'standard' && (
            <VariantDetails
              title="Standard Clean White"
              description="Clean, professional design with solid white background and subtle shadows."
              features={[
                'Solid white background',
                '56px floating center button',
                'Active indicator line',
                'Smooth color transitions',
                'Universal device support',
                'Perfect for broad audience'
              ]}
              specs={{
                'Height': '68px',
                'Background': 'Solid white',
                'Border Radius': '24px',
                'Center Button': '56px (-28px offset)',
                'Safe Area': '12px',
                'Shadow': '0 4px 16px rgba(0,0,0,0.08)'
              }}
            />
          )}

          {activeVariant === 'minimal' && (
            <VariantDetails
              title="Minimal Flat"
              description="Ultra-clean, borderless design with icon-only interface for maximum content focus."
              features={[
                'Flat design, no shadows',
                '48px inline center button',
                'Icon-only (no labels)',
                'Top border only',
                'Minimal visual weight',
                'Perfect for power users'
              ]}
              specs={{
                'Height': '64px',
                'Background': 'Solid white',
                'Border Radius': 'None (flat)',
                'Center Button': '48px (inline)',
                'Safe Area': '8px',
                'Shadow': 'None'
              }}
            />
          )}
        </div>

        {/* Usage Code */}
        <div className="mt-6 bg-gray-900 dark:bg-black rounded-2xl p-6 shadow-lg border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Usage</h3>
          <pre className="text-xs text-green-400 font-mono overflow-x-auto">
{`import { ${activeVariant === 'premium' ? 'BottomNavPremium' : activeVariant === 'standard' ? 'BottomNavStandard' : 'BottomNavMinimal'} } from '@/components/navigation';

<${activeVariant === 'premium' ? 'BottomNavPremium' : activeVariant === 'standard' ? 'BottomNavStandard' : 'BottomNavMinimal'}
  onCenterClick={() => {
    // Handle center button click
  }}
/>`}
          </pre>
        </div>
      </div>

      {/* Live Preview */}
      {activeVariant === 'premium' && <BottomNavPremium onCenterClick={() => alert('Center clicked!')} />}
      {activeVariant === 'standard' && <BottomNavStandard onCenterClick={() => alert('Center clicked!')} />}
      {activeVariant === 'minimal' && <BottomNavMinimal onCenterClick={() => alert('Center clicked!')} />}
    </div>
  );
}

// ============================================
// VARIANT DETAILS COMPONENT
// ============================================

interface VariantDetailsProps {
  title: string;
  description: string;
  features: string[];
  specs: Record<string, string>;
}

function VariantDetails({ title, description, features, specs }: VariantDetailsProps) {
  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Features
        </h4>
        <ul className="space-y-1.5">
          {features.map((feature, i) => (
            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
              <span className="text-[#FF7A00] mt-1">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Specifications
        </h4>
        <div className="space-y-2">
          {Object.entries(specs).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-500">{key}</span>
              <span className="font-mono text-gray-900 dark:text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
