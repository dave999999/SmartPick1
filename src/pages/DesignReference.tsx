/**
 * Design Reference Page - Apple-Quality UI/UX Showcase
 * 
 * Visual reference for the SmartPick Offers Sheet redesign
 * Showcases all design tokens, components, and patterns
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, MapPin, Clock, Star, ChevronRight, 
  Utensils, Coffee, ShoppingBag, Sparkles, 
  Heart, Ticket, Wrench, Grid 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const categories = [
  { id: 'all', label: 'All', icon: Grid, gradient: 'from-[#8E8E93] to-[#636366]' },
  { id: 'food', label: 'Food', icon: Utensils, gradient: 'from-[#FF6B6B] to-[#EE5A6F]' },
  { id: 'coffee', label: 'Coffee', icon: Coffee, gradient: 'from-[#A67C52] to-[#8B6F47]' },
  { id: 'retail', label: 'Retail', icon: ShoppingBag, gradient: 'from-[#4ECDC4] to-[#44A89F]' },
  { id: 'beauty', label: 'Beauty', icon: Sparkles, gradient: 'from-[#FF99CC] to-[#FF6B9D]' },
  { id: 'wellness', label: 'Wellness', icon: Heart, gradient: 'from-[#A67FFF] to-[#9B6FEE]' },
  { id: 'entertainment', label: 'Events', icon: Ticket, gradient: 'from-[#FFB347] to-[#FF9A1F]' },
  { id: 'services', label: 'Services', icon: Wrench, gradient: 'from-[#4D8EFF] to-[#3D7FEE]' },
];

const mockFlashDeal = {
  title: 'Premium Sushi Platter',
  category: 'Restaurant',
  location: 'Downtown Restaurant',
  image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
  originalPrice: 45,
  price: 22,
  discount: 50,
  timeLeft: 30,
  distance: 2.4,
  rating: 4.8,
};

const mockOffer = {
  title: 'Artisan Coffee & Pastry',
  image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  originalPrice: 12,
  price: 8,
  discount: 30,
  distance: 1.2,
  rating: 4.9,
  isActive: false,
};

export default function DesignReference() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-[28px] font-bold text-gray-9">
            SmartPick Design System
          </h1>
          <p className="text-[14px] text-gray-6 mt-1">
            Apple-quality UI/UX reference for Offers Sheet redesign
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        
        {/* Color System */}
        <section>
          <h2 className="text-[22px] font-semibold text-gray-9 mb-6">
            🎨 Color Token System
          </h2>
          
          <div className="space-y-6">
            {/* Brand Colors */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Brand Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-20 bg-[#FF8A00] rounded-xl shadow-sm"></div>
                  <p className="text-[13px] font-medium text-gray-9">Primary</p>
                  <p className="text-[11px] text-gray-6 font-mono">#FF8A00</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 bg-[#3CD878] rounded-xl shadow-sm"></div>
                  <p className="text-[13px] font-medium text-gray-9">Accent Mint</p>
                  <p className="text-[11px] text-gray-6 font-mono">#3CD878</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 bg-[#4D8EFF] rounded-xl shadow-sm"></div>
                  <p className="text-[13px] font-medium text-gray-9">Accent Blue</p>
                  <p className="text-[11px] text-gray-6 font-mono">#4D8EFF</p>
                </div>
                <div className="space-y-2">
                  <div className="h-20 bg-[#A67FFF] rounded-xl shadow-sm"></div>
                  <p className="text-[13px] font-medium text-gray-9">Accent Purple</p>
                  <p className="text-[11px] text-gray-6 font-mono">#A67FFF</p>
                </div>
              </div>
            </div>

            {/* Neutral Scale */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Neutral Scale</h3>
              <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
                {[
                  ['#FAFAFA', 'Gray 1'],
                  ['#F5F5F7', 'Gray 2'],
                  ['#E8E8ED', 'Gray 3'],
                  ['#D1D1D6', 'Gray 4'],
                  ['#AEAEB2', 'Gray 5'],
                  ['#8E8E93', 'Gray 6'],
                  ['#636366', 'Gray 7'],
                  ['#48484A', 'Gray 8'],
                  ['#1C1C1E', 'Gray 9'],
                ].map(([color, name]) => (
                  <div key={name} className="space-y-1">
                    <div className="h-16 rounded-lg shadow-sm border border-gray-3" style={{ backgroundColor: color }}></div>
                    <p className="text-[10px] text-gray-6 text-center">{name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Colors */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Feedback Colors</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="h-16 bg-[#30D158] rounded-xl shadow-sm"></div>
                  <p className="text-[13px] font-medium text-gray-9">Success</p>
                  <p className="text-[11px] text-gray-6 font-mono">#30D158</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-[#FF9F0A] rounded-xl shadow-sm"></div>
                  <p className="text-[13px] font-medium text-gray-9">Warning</p>
                  <p className="text-[11px] text-gray-6 font-mono">#FF9F0A</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-[#FF3B30] rounded-xl shadow-sm"></div>
                  <p className="text-[13px] font-medium text-gray-9">Danger</p>
                  <p className="text-[11px] text-gray-6 font-mono">#FF3B30</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="bg-gray-3" />

        {/* Typography System */}
        <section>
          <h2 className="text-[22px] font-semibold text-gray-9 mb-6">
            🔡 Typography System
          </h2>
          
          <div className="space-y-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-3">
            <div className="space-y-2">
              <p className="text-[34px] leading-[40px] tracking-[-0.02em] font-bold text-gray-9">
                Display Large
              </p>
              <p className="text-[11px] text-gray-6 font-mono">34px / 40px · -0.02em · Bold</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-[22px] leading-[28px] tracking-[-0.01em] font-semibold text-gray-9">
                Title Large
              </p>
              <p className="text-[11px] text-gray-6 font-mono">22px / 28px · -0.01em · Semibold</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-gray-9">
                Title Medium
              </p>
              <p className="text-[11px] text-gray-6 font-mono">18px / 24px · -0.01em · Semibold</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-[15px] leading-[22px] text-gray-8">
                Body Medium - Used for card descriptions and main content
              </p>
              <p className="text-[11px] text-gray-6 font-mono">15px / 22px · 0 · Regular</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-[13px] leading-[18px] text-gray-7">
                Caption Large - Category pills and small labels
              </p>
              <p className="text-[11px] text-gray-6 font-mono">13px / 18px · 0 · Regular</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-[12px] leading-[16px] tracking-[0.01em] font-medium text-gray-7">
                Caption Medium - Badges, tags, timestamps
              </p>
              <p className="text-[11px] text-gray-6 font-mono">12px / 16px · 0.01em · Medium</p>
            </div>
          </div>
        </section>

        <Separator className="bg-gray-3" />

        {/* Spacing System */}
        <section>
          <h2 className="text-[22px] font-semibold text-gray-9 mb-6">
            📏 Spacing System
          </h2>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                ['4px', 'Space 1'],
                ['8px', 'Space 2'],
                ['12px', 'Space 3'],
                ['16px', 'Space 4'],
                ['20px', 'Space 5'],
                ['24px', 'Space 6'],
                ['32px', 'Space 8'],
                ['48px', 'Space 12'],
              ].map(([size, name]) => (
                <div key={name} className="space-y-2">
                  <div className="h-12 bg-[#FF8A00] rounded-lg" style={{ width: size }}></div>
                  <p className="text-[13px] font-medium text-gray-9">{name}</p>
                  <p className="text-[11px] text-gray-6">{size}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator className="bg-gray-3" />

        {/* Component Showcase */}
        <section>
          <h2 className="text-[22px] font-semibold text-gray-9 mb-6">
            🃏 Component Library
          </h2>

          {/* Search Bar */}
          <div className="space-y-6">
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Search Bar</h3>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-3">
                <div className="relative max-w-md">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search coffee, sushi, spa..."
                    className="h-[52px] pl-12 pr-12 rounded-2xl bg-[#F5F5F7] border-0 text-[15px] placeholder:text-[#8E8E93] focus-visible:ring-2 focus-visible:ring-[#FF8A00]"
                  />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2">
                    <MapPin size={20} className="text-[#8E8E93]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Category Row</h3>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-3 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {categories.map((cat, index) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    
                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`
                          flex flex-col items-center justify-center gap-1.5 
                          min-w-[72px] h-16 px-4 rounded-2xl
                          bg-gradient-to-br ${cat.gradient}
                          shadow-[0_2px_8px_rgba(0,0,0,0.12)]
                          transition-all duration-300
                          ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-[#FAFAFA] scale-105' : ''}
                        `}
                      >
                        <Icon size={24} className="text-white" strokeWidth={2} />
                        <span className="text-[13px] font-semibold text-white leading-none">
                          {cat.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Flash Deal Card */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Flash Deal Card (280×340px)</h3>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-3">
                <div className="max-w-[280px]">
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card className="h-[340px] overflow-hidden border-0 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-shadow">
                      {/* Image Section */}
                      <div className="relative h-[180px] bg-gray-2">
                        <img 
                          src={mockFlashDeal.image} 
                          alt={mockFlashDeal.title}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Countdown Badge */}
                        <Badge className="absolute top-3 right-3 bg-[#FF3B30]/90 backdrop-blur-sm text-white border-0 shadow-lg flex items-center gap-1">
                          <Clock size={11} strokeWidth={3} />
                          <span className="text-[11px] font-bold tracking-wide">
                            {mockFlashDeal.timeLeft} MIN LEFT
                          </span>
                        </Badge>
                      </div>

                      {/* Content Section */}
                      <CardContent className="p-4 space-y-3">
                        <p className="text-[12px] text-[#8E8E93] font-medium">
                          🏷 {mockFlashDeal.category}
                        </p>
                        
                        <h3 className="text-[18px] font-bold text-[#1C1C1E] leading-tight line-clamp-2">
                          {mockFlashDeal.title}
                        </h3>
                        
                        <p className="text-[14px] text-[#8E8E93] line-clamp-1">
                          {mockFlashDeal.location}
                        </p>
                        
                        {/* Badges Row */}
                        <div className="flex gap-2">
                          <Badge className="bg-[#FF8A00] hover:bg-[#FF9F33] text-white border-0 px-2.5 py-1 text-[13px] font-bold">
                            -{mockFlashDeal.discount}% OFF
                          </Badge>
                          <Badge className="bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#636366] border-0 px-2.5 py-1 text-[12px] font-medium flex items-center gap-1">
                            <MapPin size={12} />
                            {mockFlashDeal.distance} km
                          </Badge>
                        </div>
                        
                        {/* Price Row */}
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-[16px] text-[#AEAEB2] line-through">
                            {mockFlashDeal.originalPrice}₾
                          </span>
                          <span className="text-[24px] font-bold text-[#1C1C1E]">
                            {mockFlashDeal.price}₾
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Offer Card (Grid) */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Offer Card - Grid Item (168×220px)</h3>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-3">
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300">
                      {/* Image Section */}
                      <div className="relative aspect-[3/2] bg-gray-2">
                        <img 
                          src={mockOffer.image} 
                          alt={mockOffer.title}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Discount Badge */}
                        <Badge className="absolute top-2 left-2 bg-[#FF8A00] text-white border-0 shadow-sm px-2 py-0.5 text-[12px] font-bold">
                          -{mockOffer.discount}%
                        </Badge>
                      </div>

                      {/* Content Section */}
                      <CardContent className="p-3 space-y-1.5">
                        <h4 className="text-[15px] font-bold text-[#1C1C1E] leading-tight line-clamp-1">
                          {mockOffer.title}
                        </h4>
                        
                        {/* Metadata Row */}
                        <div className="flex items-center gap-1.5 text-[12px] text-[#8E8E93]">
                          <div className="flex items-center gap-0.5">
                            <Star size={12} className="fill-[#FF8A00] text-[#FF8A00]" />
                            <span className="font-medium">{mockOffer.rating}</span>
                          </div>
                          <span>·</span>
                          <div className="flex items-center gap-0.5">
                            <MapPin size={12} />
                            <span>{mockOffer.distance} km</span>
                          </div>
                        </div>
                        
                        {/* Price Row */}
                        <div className="flex items-baseline gap-1.5 pt-1">
                          <span className="text-[13px] text-[#AEAEB2] line-through">
                            {mockOffer.originalPrice}₾
                          </span>
                          <span className="text-[17px] font-bold text-[#1C1C1E]">
                            {mockOffer.price}₾
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Active Offer Card */}
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-[0_1px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300">
                      {/* Image Section */}
                      <div className="relative aspect-[3/2] bg-gray-2">
                        <img 
                          src={mockOffer.image} 
                          alt={mockOffer.title}
                          className="w-full h-full object-cover"
                        />
                        
                        <Badge className="absolute top-2 left-2 bg-[#FF8A00] text-white border-0 shadow-sm px-2 py-0.5 text-[12px] font-bold">
                          -{mockOffer.discount}%
                        </Badge>
                        
                        {/* Active Badge */}
                        <Badge className="absolute top-2 right-2 bg-gradient-to-r from-[#3CD878] to-[#30D158] text-white border-0 shadow-[0_2px_8px_rgba(60,216,120,0.3)] flex items-center gap-0.5 px-2 py-0.5">
                          <span className="text-[11px] font-bold tracking-wide uppercase">
                            Active
                          </span>
                          <ChevronRight size={12} strokeWidth={3} />
                        </Badge>
                      </div>

                      <CardContent className="p-3 space-y-1.5">
                        <h4 className="text-[15px] font-bold text-[#1C1C1E] leading-tight line-clamp-1">
                          Reserved Offer
                        </h4>
                        
                        <div className="flex items-center gap-1.5 text-[12px] text-[#8E8E93]">
                          <div className="flex items-center gap-0.5">
                            <Star size={12} className="fill-[#FF8A00] text-[#FF8A00]" />
                            <span className="font-medium">{mockOffer.rating}</span>
                          </div>
                          <span>·</span>
                          <div className="flex items-center gap-0.5">
                            <MapPin size={12} />
                            <span>{mockOffer.distance} km</span>
                          </div>
                        </div>
                        
                        <div className="flex items-baseline gap-1.5 pt-1">
                          <span className="text-[13px] text-[#AEAEB2] line-through">
                            {mockOffer.originalPrice}₾
                          </span>
                          <span className="text-[17px] font-bold text-[#1C1C1E]">
                            {mockOffer.price}₾
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Badges & Tags</h3>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-3">
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-[#FF8A00] text-white px-3 py-1.5 text-[13px] font-bold">
                    -50% OFF
                  </Badge>
                  <Badge className="bg-[#F5F5F7] text-[#636366] px-3 py-1.5 text-[12px] font-medium">
                    2.4 km away
                  </Badge>
                  <Badge className="bg-[#FF3B30]/90 backdrop-blur-sm text-white px-3 py-1.5 text-[11px] font-bold">
                    ⏰ 30 MIN LEFT
                  </Badge>
                  <Badge className="bg-gradient-to-r from-[#3CD878] to-[#30D158] text-white px-3 py-1.5 text-[11px] font-bold shadow-[0_2px_8px_rgba(60,216,120,0.3)]">
                    ACTIVE ›
                  </Badge>
                  <Badge className="bg-[#30D158]/10 text-[#30D158] px-3 py-1.5 text-[12px] font-semibold">
                    ✓ Reserved
                  </Badge>
                  <Badge className="bg-[#FF9F0A]/10 text-[#FF9F0A] px-3 py-1.5 text-[12px] font-semibold">
                    ⚠ Ending Soon
                  </Badge>
                </div>
              </div>
            </div>

            {/* Shadows */}
            <div>
              <h3 className="text-[16px] font-semibold text-gray-8 mb-3">Shadow System</h3>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    ['shadow-xs', '0 1px 2px rgba(0,0,0,0.04)'],
                    ['shadow-sm', '0 1px 8px rgba(0,0,0,0.04)'],
                    ['shadow-md', '0 2px 12px rgba(0,0,0,0.06)'],
                    ['shadow-lg', '0 4px 20px rgba(0,0,0,0.08)'],
                    ['shadow-xl', '0 8px 32px rgba(0,0,0,0.12)'],
                  ].map(([name, value]) => (
                    <div key={name} className="space-y-2">
                      <div 
                        className="h-20 bg-white rounded-xl border border-gray-3" 
                        style={{ boxShadow: value }}
                      ></div>
                      <p className="text-[11px] font-medium text-gray-9">{name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full Layout Preview */}
        <section>
          <h2 className="text-[22px] font-semibold text-gray-9 mb-6">
            📱 Full Layout Preview
          </h2>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-3 overflow-hidden max-w-[390px] mx-auto">
            {/* Mobile Frame */}
            <div className="bg-[#FAFAFA] h-[700px] overflow-y-auto">
              {/* Safe Area */}
              <div className="h-11 bg-white"></div>
              
              {/* Drag Handle */}
              <div className="flex justify-center pt-5 pb-6 bg-white">
                <div className="w-9 h-1 bg-[#D1D1D6] rounded-full"></div>
              </div>

              {/* Header */}
              <div className="px-4 pb-4 bg-white">
                <h1 className="text-[34px] leading-[40px] tracking-[-0.02em] font-bold text-[#1C1C1E]">
                  Discover Deals
                </h1>
                <div className="flex items-center gap-1.5 text-[14px] text-[#8E8E93] mt-2">
                  <MapPin size={14} className="text-[#FF8A00]" />
                  <span>Downtown Tbilisi</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-4 pb-4 bg-white">
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                  <input
                    placeholder="Search coffee, sushi, spa..."
                    className="w-full h-[52px] pl-12 pr-4 rounded-2xl bg-[#F5F5F7] border-0 text-[15px] placeholder:text-[#8E8E93]"
                  />
                </div>
              </div>

              {/* Category Row */}
              <div className="pb-6 bg-white overflow-x-auto">
                <div className="flex gap-2 px-4">
                  {categories.slice(0, 4).map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        className={`flex flex-col items-center justify-center gap-1.5 min-w-[72px] h-16 px-4 rounded-2xl bg-gradient-to-br ${cat.gradient} shadow-[0_2px_8px_rgba(0,0,0,0.12)]`}
                      >
                        <Icon size={24} className="text-white" strokeWidth={2} />
                        <span className="text-[13px] font-semibold text-white leading-none">
                          {cat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Flash Deals Section */}
              <div className="space-y-4 pb-5 bg-[#FAFAFA]">
                <div className="px-4">
                  <h2 className="text-[22px] leading-[28px] tracking-[-0.01em] font-semibold text-[#1C1C1E]">
                    ⚡ Ends Soon
                  </h2>
                  <p className="text-[14px] text-[#8E8E93] mt-0.5">
                    Limited time offers
                  </p>
                </div>
              </div>

              {/* Best Sellers Grid */}
              <div className="px-4 pb-8 bg-[#FAFAFA]">
                <h2 className="text-[22px] leading-[28px] tracking-[-0.01em] font-semibold text-[#1C1C1E] mb-4">
                  🔥 Best Near You
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                      <div className="aspect-[3/2] bg-[#F5F5F7]"></div>
                      <div className="p-3">
                        <div className="h-4 bg-[#E8E8ED] rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-[#F5F5F7] rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-8 text-[14px] text-gray-6">
          <p>SmartPick Design System v1.0</p>
          <p className="mt-1">Apple-quality UI/UX for premium marketplace experience</p>
        </div>
      </div>
    </div>
  );
}
