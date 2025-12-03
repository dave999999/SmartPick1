/**
 * Active Reservation Modal V2 - Interactive Demo
 * 
 * View both variants (Minimal & Glossy) with live controls
 */

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ActiveReservationCard } from '@/components/reservation/ActiveReservationCardV2';
import type { ActiveReservation } from '@/components/reservation/ActiveReservationCardV2';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import 'leaflet/dist/leaflet.css';

export default function ActiveReservationV2Demo() {
  const [variant, setVariant] = useState<'minimal' | 'glossy'>('glossy');
  const [showReservation, setShowReservation] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(15); // minutes

  // Mock data
  const userLocation = { lat: 41.7151, lng: 44.8271 };
  const partnerLocation = { lat: 41.7180, lng: 44.8300 };

  const mockReservation: ActiveReservation = {
    id: 'demo-123',
    offerTitle: '50% Off Fresh Pizza',
    partnerName: 'Pizza Palace',
    imageUrl: '/placeholder-food.jpg',
    quantity: 2,
    expiresAt: new Date(Date.now() + timeRemaining * 60 * 1000).toISOString(),
    pickupWindowStart: new Date().toISOString(),
    pickupWindowEnd: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    qrPayload: 'DEMO_RESERVATION_123_USER_456',
    partnerLocation,
    pickupAddress: '123 Freedom Square, Tbilisi',
  };

  const handleNavigate = (reservation: ActiveReservation) => {
    alert(`Navigate to: ${reservation.pickupAddress}`);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${reservation.partnerLocation.lat},${reservation.partnerLocation.lng}`,
      '_blank'
    );
  };

  const handleCancel = (reservationId: string) => {
    console.log('Cancel reservation:', reservationId);
    setShowReservation(false);
    setTimeout(() => setShowReservation(true), 2000);
  };

  const handleExpired = () => {
    console.log('Reservation expired');
    alert('Reservation has expired');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-[60] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Active Reservation V2 Demo
              </h1>
              <p className="text-sm text-gray-600">
                Ultra-Premium Apple Wolt-Style Floating QR
              </p>
            </div>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
            >
              ← Back
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="container mx-auto px-4 py-6">
        <Card className="p-6 mb-6 bg-white shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Demo Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Variant Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2">Variant</label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setVariant('glossy')}
                  variant={variant === 'glossy' ? 'default' : 'outline'}
                  className="flex-1"
                >
                  ✨ Premium Glossy
                </Button>
                <Button
                  onClick={() => setVariant('minimal')}
                  variant={variant === 'minimal' ? 'default' : 'outline'}
                  className="flex-1"
                >
                  Minimal White
                </Button>
              </div>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Time Remaining: {timeRemaining} min
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setTimeRemaining(25)}
                  variant="outline"
                  size="sm"
                >
                  25min (Green)
                </Button>
                <Button
                  onClick={() => setTimeRemaining(10)}
                  variant="outline"
                  size="sm"
                >
                  10min (Orange)
                </Button>
                <Button
                  onClick={() => setTimeRemaining(3)}
                  variant="outline"
                  size="sm"
                >
                  3min (Red)
                </Button>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <Button
                onClick={() => setShowReservation(!showReservation)}
                variant={showReservation ? 'default' : 'outline'}
                className="w-full"
              >
                {showReservation ? '✅ Showing' : '❌ Hidden'}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Try clicking the QR code to enlarge it, test the buttons,
              and change the timer to see color transitions (Green → Orange → Red).
            </p>
          </div>
        </Card>

        {/* Variant Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className={`p-4 ${variant === 'glossy' ? 'ring-2 ring-orange-500' : ''}`}>
            <h3 className="font-semibold text-lg mb-2">✨ Premium Glossy</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Gradient backgrounds</li>
              <li>• Layered shadows (0.06-0.12 opacity)</li>
              <li>• Glossy ring overlay</li>
              <li>• Inset highlight on buttons</li>
              <li>• Micro-dots pulse animation</li>
              <li>• Best for: Premium experience</li>
            </ul>
          </Card>

          <Card className={`p-4 ${variant === 'minimal' ? 'ring-2 ring-orange-500' : ''}`}>
            <h3 className="font-semibold text-lg mb-2">Minimal White</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Flat white backgrounds</li>
              <li>• Soft shadows (0.04 opacity)</li>
              <li>• No gradients</li>
              <li>• Simple style</li>
              <li>• Performance optimized</li>
              <li>• Best for: Everyday use</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Map with Floating Reservation Card */}
      <div className="relative h-[600px] md:h-[700px] overflow-visible">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={15}
          className="absolute inset-0 z-0"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User location marker */}
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>Your Location</Popup>
          </Marker>

          {/* Partner location marker */}
          <Marker position={[partnerLocation.lat, partnerLocation.lng]}>
            <Popup>{mockReservation.partnerName}</Popup>
          </Marker>
        </MapContainer>

        {/* Floating Reservation Card (Wolt-style) */}
        {showReservation && (
          <ActiveReservationCard
            reservation={mockReservation}
            userLocation={userLocation}
            onNavigate={handleNavigate}
            onCancel={handleCancel}
            onExpired={handleExpired}
            variant={variant}
          />
        )}
      </div>

      {/* Design Specs */}
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold mb-4">Design Specifications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Floating QR Module</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Size: 170px × 170px</li>
                <li>• QR Card: 130px × 130px</li>
                <li>• Border radius: 14px</li>
                <li>• Top offset: -85px (50% overlap)</li>
                <li>• Ring stroke: 4px</li>
                <li>• 18 micro-dots animation</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Modal Body</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Max height: 50vh</li>
                <li>• Timer: 56px bold</li>
                <li>• Border radius: 28px (top)</li>
                <li>• Backdrop blur: 18px</li>
                <li>• Saturate: 180%</li>
                <li>• Ultra-compact spacing</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Interactions</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• QR tap: scale(1.08), 120ms</li>
                <li>• Button press: scale(0.97), 140ms</li>
                <li>• Modal entrance: Spring physics</li>
                <li>• Ring progress: 1s ease-out</li>
                <li>• Micro-dots: 2s pulse</li>
                <li>• 60 FPS smooth</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
            <h3 className="font-semibold mb-2">Color States</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm">{">"} 15min (Success)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <span className="text-sm">5-15min (Warning)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm">{"<"} 5min (Danger)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Documentation Links */}
      <div className="container mx-auto px-4 pb-12">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold mb-4">📚 Complete Documentation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Design System</h3>
              <ul className="text-sm space-y-1">
                <li>• ACTIVE_RESERVATION_V2_DESIGN_SPEC.md</li>
                <li>• Complete design tokens</li>
                <li>• Animation timings</li>
                <li>• Responsive breakpoints</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Implementation</h3>
              <ul className="text-sm space-y-1">
                <li>• ACTIVE_RESERVATION_V2_IMPLEMENTATION.md</li>
                <li>• Usage examples</li>
                <li>• API documentation</li>
                <li>• Testing guide</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Visual Reference</h3>
              <ul className="text-sm space-y-1">
                <li>• ACTIVE_RESERVATION_V2_VISUAL_REFERENCE.md</li>
                <li>• Precise measurements</li>
                <li>• Variant comparison</li>
                <li>• Interaction states</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <ul className="text-sm space-y-1">
                <li>• ACTIVE_RESERVATION_V2_SUMMARY.md</li>
                <li>• Project overview</li>
                <li>• Quick start guide</li>
                <li>• Deliverables checklist</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
