// Improved marker creation with smaller size and zoom-based scaling
// To be used in SmartPickMap.tsx

import maplibregl from 'maplibre-gl';

export function createPulsingMarkerRedesigned(
  _map: maplibregl.Map,
  color: string = '#FF8A00',
  baseSize: number = 32 // Reduced from 40px to 32px
): HTMLElement {
  const markerEl = document.createElement('div');
  markerEl.className = 'smartpick-pulsing-marker-v2';
  markerEl.style.width = `${baseSize}px`;
  markerEl.style.height = `${baseSize}px`;
  markerEl.style.position = 'relative';
  
  // Inner circle - with reduced glow
  const circle = document.createElement('div');
  circle.className = 'marker-circle-v2';
  circle.style.cssText = `
    width: 100%;
    height: 100%;
    background: ${color};
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    position: absolute;
    top: 0;
    left: 0;
    transition: transform 0.2s ease;
    z-index: 2;
  `;
  
  // Outer pulsing ring - reduced radius
  const pulse = document.createElement('div');
  pulse.className = 'marker-pulse-v2';
  pulse.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: ${color};
    opacity: 0.4;
    transform: translate(-50%, -50%);
    animation: smartpick-pulse-v2 2s ease-out infinite;
  `;
  
  markerEl.appendChild(pulse);
  markerEl.appendChild(circle);
  
  // Hover effect
  markerEl.addEventListener('mouseenter', () => {
    circle.style.transform = 'scale(1.15)';
  });
  
  markerEl.addEventListener('mouseleave', () => {
    circle.style.transform = 'scale(1)';
  });
  
  return markerEl;
}

export function createExpiringMarkerRedesigned(map: maplibregl.Map): HTMLElement {
  return createPulsingMarkerRedesigned(map, '#37E5AE', 32);
}

// Zoom-based scaling function
export function getMarkerSizeByZoom(zoom: number, baseSize: number = 32): number {
  if (zoom < 12) return baseSize * 0.7; // Far out
  if (zoom < 14) return baseSize * 0.85; // Medium
  if (zoom < 16) return baseSize; // Normal
  return baseSize * 1.15; // Zoomed in
}

// CSS styles to inject
export const markerStylesRedesigned = `
  @keyframes smartpick-pulse-v2 {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.4;
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
    }
  }

  .smartpick-pulsing-marker-v2 {
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .smartpick-pulsing-marker-v2:hover {
    transform: scale(1.1);
    z-index: 1000 !important;
  }

  .smartpick-pulsing-marker-v2:active {
    transform: scale(0.95);
  }

  /* Reduced glow for better map visibility */
  .marker-circle-v2 {
    filter: drop-shadow(0 0 4px rgba(255, 138, 0, 0.4));
  }

  /* Dimmed map overlay when bottom sheet expanded */
  .map-dimmed::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    pointer-events: none;
    transition: opacity 300ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .marker-pulse-v2 {
      animation: none !important;
    }
    
    .smartpick-pulsing-marker-v2:hover {
      transform: scale(1.05);
    }
  }
`;
