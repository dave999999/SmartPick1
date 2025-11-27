// SmartPick Light Mode — Complete Homepage Layout
// Recreates the soft pastel UI with top chips, map, and teal bottom navbar

'use client';

import { useState, useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, MapPin, Heart, User, Grid } from 'lucide-react';
import lightStyle from '@/map/styles/smartpick-light.maplibre.json';
import { PASTEL_PINS, PASTEL_PIN_COLORS } from '@/components/map/PastelPins';
import { supabase } from '@/lib/supabase';

interface Offer {
  id: string;
  title: string;
  category: string;
  partner: {
    business_name: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

const CATEGORIES = [
  { id: 'bakery', label: 'Bakery', icon: '🥖' },
  { id: 'coffee', label: 'Coffee', icon: '☕' },
  { id: 'desserts', label: 'Desserts', icon: '🍰' },
  { id: 'fresh-produce', label: 'Fresh', icon: '🥗' },
  { id: 'meat-fish', label: 'Meat', icon: '🥩' },
  { id: 'hot-meals', label: 'Hot Meals', icon: '🍲' },
  { id: 'pizza', label: 'Pizza', icon: '🍕' },
  { id: 'healthy', label: 'Healthy', icon: '🥑' },
  { id: 'drinks', label: 'Drinks', icon: '🥤' },
  { id: 'prepared-meals', label: 'Prepared', icon: '📦' },
  { id: 'snacks', label: 'Snacks', icon: '🍿' },
  { id: 'grocery', label: 'Grocery', icon: '🛒' },
];

const BOTTOM_TABS = [
  { id: 'map', label: 'Map', icon: MapPin },
  { id: 'browse', label: 'Browse', icon: Grid },
  { id: 'saved', label: 'Saved', icon: Heart },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function LightModeHomepage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [mapTilerKey, setMapTilerKey] = useState<string | null>(null);

  // Fetch MapTiler key
  useEffect(() => {
    const fetchKey = async () => {
      const envKey = import.meta.env.VITE_MAPTILER_KEY;
      if (envKey && envKey !== 'your_maptiler_api_key_here') {
        setMapTilerKey(envKey);
        return;
      }

      const { data, error } = await supabase
        .from('app_config')
        .select('config_value')
        .eq('config_key', 'maptiler_api_key')
        .single();

      if (!error && data?.config_value) {
        setMapTilerKey(data.config_value);
      }
    };
    fetchKey();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapTilerKey) return;

    const styleWithKey = JSON.parse(JSON.stringify(lightStyle));
    styleWithKey.sprite = `https://api.maptiler.com/maps/streets/sprite?key=${mapTilerKey}`;
    styleWithKey.glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${mapTilerKey}`;
    styleWithKey.sources.openmaptiles.url = `https://api.maptiler.com/tiles/v3/tiles.json?key=${mapTilerKey}`;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleWithKey,
      center: [44.793, 41.72],
      zoom: 12,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapTilerKey]);

  return (
    <div className="relative h-screen w-full bg-[#F4EDE1] flex flex-col">
      {/* Top Bar - Search */}
      <div className="px-4 pt-4 pb-2 bg-[#F4EDE1]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B8275]" />
          <input
            type="text"
            placeholder="Search for food near you..."
            className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-[#6B6358] placeholder:text-[#B8AEA3] shadow-sm border border-[#E8E4DF] focus:outline-none focus:ring-2 focus:ring-[#7BAFC2]/30 focus:border-[#7BAFC2]"
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className="px-4 pb-3 bg-[#F4EDE1]">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {/* Open Now Toggle */}
          <button
            onClick={() => setOpenNow(!openNow)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${
                openNow
                  ? 'bg-[#7BAFC2] text-white shadow-md'
                  : 'bg-white text-[#6B6358] border border-[#E8E4DF] shadow-sm hover:shadow-md'
              }
            `}
          >
            <span className="mr-1.5">⏰</span>
            OPEN NOW
          </button>

          {/* Category Pills */}
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
              }
              className={`
                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${
                  selectedCategory === cat.id
                    ? 'bg-white text-[#6B6358] border-2 border-[#7BAFC2] shadow-md'
                    : 'bg-white text-[#8B8275] border border-[#E8E4DF] shadow-sm hover:shadow-md'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 px-4 pb-20">
        <div
          ref={mapContainerRef}
          className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-[#E8E4DF]"
        />
      </div>

      {/* Bottom Navbar - Teal */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#7BAFC2] shadow-lg border-t border-[#6A9AAC]">
        <div className="flex items-center justify-around h-full px-4">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-all
                  ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}
                `}
              >
                <Icon
                  className={`w-6 h-6 ${
                    isActive ? 'text-white' : 'text-white/80'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-white' : 'text-white/80'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
