/**
 * SpecialOfferCard Usage Example
 * Demo page showing the pixel-perfect Special Offer Card implementation
 */

import React from 'react';
import { SpecialOfferCard, SpecialOfferCardMobile } from './SpecialOfferCard';

export default function SpecialOfferCardDemo() {
  const exampleOffer = {
    title: 'Margherita Pizza',
    imageUrl: '/images/margherita-pizza.jpg', // Replace with your image
    currentPrice: 12,
    originalPrice: 25,
    discountPercent: 52,
    distance: '0.8 km',
    eta: '1.5 km away',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Special Offer Card - Pixel Perfect Recreation
          </h1>
          <p className="text-gray-600">
            Exact 1:1 copy of the reference screenshot
          </p>
        </div>

        {/* Desktop Version */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Desktop / Tablet Version
          </h2>
          <div className="max-w-md">
            <SpecialOfferCard
              {...exampleOffer}
              onReserve={() => alert('Reserved!')}
            />
          </div>
        </div>

        {/* Mobile Version */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Mobile Version (iPhone SE)
          </h2>
          <div className="max-w-xs">
            <SpecialOfferCardMobile
              {...exampleOffer}
              onReserve={() => alert('Reserved!')}
            />
          </div>
        </div>

        {/* Design Specifications */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🎨 Design Specifications
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Glass Morphism</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• backdrop-blur: 24px</li>
                <li>• background: rgba(255, 255, 255, 0.4)</li>
                <li>• border: 1px solid rgba(255, 255, 255, 0.2)</li>
                <li>• border-radius: 24px</li>
                <li>• shadow: 0 8px 32px rgba(0,0,0,0.12)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Image</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Size: 76px × 76px (1:1 square)</li>
                <li>• Border radius: 16px</li>
                <li>• Shadow: 0 4px 12px rgba(0,0,0,0.15)</li>
                <li>• Object-fit: cover</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Typography</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Title: 15px, font-semibold</li>
                <li>• Price: 22px, font-bold, #FF8A00</li>
                <li>• Old price: 12px, line-through, #9CA3AF</li>
                <li>• Badge: 10px, font-semibold, white</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Button</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Gradient: #FF8A00 → #FF5A00</li>
                <li>• Border radius: 9999px (full pill)</li>
                <li>• Padding: 8px 20px</li>
                <li>• Shadow: 0 4px 16px rgba(255,138,0,0.3)</li>
                <li>• Text: 14px, font-semibold, white</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Discount Badge</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Gradient: #FF7A00 → #FF4E00</li>
                <li>• Border radius: 9999px</li>
                <li>• Padding: 2px 8px</li>
                <li>• Text: 10px, font-semibold, white</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Spacing</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Card padding: 16px</li>
                <li>• Image-to-content gap: 12px</li>
                <li>• Internal vertical gap: 6px</li>
                <li>• Button positioning: absolute bottom-right</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
