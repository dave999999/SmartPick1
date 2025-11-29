/**
 * FloatingBottomNavDemo - Demo page to showcase the floating navigation
 * Shows both light and dark mode variants with explanations
 */

import { useState } from 'react';
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
import { Moon, Sun } from 'lucide-react';

export default function FloatingBottomNavDemo() {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-sp-bg transition-colors duration-300">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-sp-surface1/80 backdrop-blur-xl border-b border-gray-200 dark:border-sp-border-soft">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-sp-text-primary">
                🧡 Floating Bottom Nav
              </h1>
              <p className="text-sm text-gray-600 dark:text-sp-text-secondary">
                Premium curved navigation with floating center button
              </p>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="
                p-3 rounded-2xl
                bg-gray-100 dark:bg-sp-surface2
                hover:bg-gray-200 dark:hover:bg-sp-surface2/60
                transition-all duration-300
                text-gray-700 dark:text-sp-text-primary
              "
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-4xl mx-auto px-6 py-12 pb-32">
          
          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <FeatureCard
              icon="🎨"
              title="Cosmic Orange Theme"
              description="Premium gradient with #FF8A00 cosmic orange accent"
              isDark={isDark}
            />
            <FeatureCard
              icon="⭕"
              title="Floating Center Button"
              description="Elevated 20px above bar with subtle glow animation"
              isDark={isDark}
            />
            <FeatureCard
              icon="🌊"
              title="Curved Design"
              description="28px rounded corners with soft shadow depth"
              isDark={isDark}
            />
            <FeatureCard
              icon="✨"
              title="Smooth Animations"
              description="300ms transitions with micro-interactions"
              isDark={isDark}
            />
            <FeatureCard
              icon="📱"
              title="iOS Safe Area"
              description="Respects home indicator with proper padding"
              isDark={isDark}
            />
            <FeatureCard
              icon="🎯"
              title="Active States"
              description="Orange accent with scale & pulse effects"
              isDark={isDark}
            />
          </div>

          {/* Design Specs */}
          <div className="bg-gray-50 dark:bg-sp-surface1 rounded-3xl p-8 border border-gray-200 dark:border-sp-border-soft">
            <h2 className="text-xl font-bold text-gray-900 dark:text-sp-text-primary mb-6">
              Design Specifications
            </h2>
            
            <div className="space-y-4">
              <SpecRow label="Bar Height" value="72px" isDark={isDark} />
              <SpecRow label="Border Radius" value="28px" isDark={isDark} />
              <SpecRow label="Center Button Size" value="70x70px" isDark={isDark} />
              <SpecRow label="Center Button Elevation" value="-20px (from top)" isDark={isDark} />
              <SpecRow label="Bottom Margin" value="16px + safe-area" isDark={isDark} />
              <SpecRow label="Side Padding" value="16px" isDark={isDark} />
              <SpecRow label="Icon Size" value="24x24px" isDark={isDark} />
              <SpecRow label="Label Font Size" value="10px" isDark={isDark} />
              <SpecRow label="Shadow" value="0 10px 40px rgba(0,0,0,0.12)" isDark={isDark} />
              <SpecRow label="Transition Duration" value="300ms" isDark={isDark} />
            </div>
          </div>

          {/* Color Palette */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-sp-text-primary mb-6">
              Color Palette
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ColorSwatch 
                color="#FF8A00" 
                name="Cosmic Orange" 
                subtitle="Primary accent"
                isDark={isDark}
              />
              <ColorSwatch 
                color="#FF6B00" 
                name="Orange Dark" 
                subtitle="Gradient end"
                isDark={isDark}
              />
              <ColorSwatch 
                color="#C9F9E9" 
                name="Mint Accent" 
                subtitle="Secondary"
                isDark={isDark}
              />
              <ColorSwatch 
                color="#6B7280" 
                name="Neutral Gray" 
                subtitle="Inactive state"
                isDark={isDark}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-12 p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-sp-surface2 dark:to-sp-surface1 rounded-3xl border border-orange-200 dark:border-sp-border-soft">
            <h3 className="text-lg font-bold text-gray-900 dark:text-sp-text-primary mb-3">
              💡 Try it out!
            </h3>
            <p className="text-sm text-gray-700 dark:text-sp-text-secondary mb-4">
              The floating navigation bar is fixed at the bottom of this page. 
              Try clicking the buttons to see the smooth transitions and active states.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-sp-text-muted">
              <li>• Click tabs to see active state animations</li>
              <li>• The center button has a subtle float animation</li>
              <li>• Toggle dark mode to see both themes</li>
              <li>• Scroll to test the fixed positioning</li>
            </ul>
          </div>

        </div>

        {/* Floating Bottom Nav Component */}
        <FloatingBottomNav />
      </div>
    </div>
  );
}

// Helper Components
function FeatureCard({ icon, title, description, isDark }: any) {
  return (
    <div className={`
      p-6 rounded-2xl border transition-colors
      ${isDark 
        ? 'bg-sp-surface1 border-sp-border-soft' 
        : 'bg-white border-gray-200'
      }
    `}>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-sp-text-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-sp-text-secondary">
        {description}
      </p>
    </div>
  );
}

function SpecRow({ label, value, isDark }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-sp-border-soft last:border-0">
      <span className="text-sm font-medium text-gray-700 dark:text-sp-text-secondary">
        {label}
      </span>
      <code className={`
        text-sm font-mono px-3 py-1 rounded-lg
        ${isDark 
          ? 'bg-sp-surface2 text-sp-accent-orange' 
          : 'bg-gray-100 text-orange-600'
        }
      `}>
        {value}
      </code>
    </div>
  );
}

function ColorSwatch({ color, name, subtitle, isDark }: any) {
  return (
    <div className={`
      p-4 rounded-2xl border transition-colors
      ${isDark 
        ? 'bg-sp-surface1 border-sp-border-soft' 
        : 'bg-white border-gray-200'
      }
    `}>
      <div 
        className="w-full h-20 rounded-xl mb-3 shadow-lg"
        style={{ backgroundColor: color }}
      />
      <div className="text-sm font-semibold text-gray-900 dark:text-sp-text-primary">
        {name}
      </div>
      <div className="text-xs text-gray-600 dark:text-sp-text-muted">
        {subtitle}
      </div>
      <code className="text-xs text-gray-500 dark:text-sp-text-muted font-mono">
        {color}
      </code>
    </div>
  );
}
