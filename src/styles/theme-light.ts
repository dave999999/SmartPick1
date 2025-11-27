// SmartPick Light Mode — Design Tokens & Theme Configuration

export const lightModeTheme = {
  // Core palette
  colors: {
    // Map
    mapBase: '#F4EDE1',
    mapRoadPrimary: '#D9D3C8',
    mapRoadSecondary: '#E0DBD1',
    mapRoadTertiary: '#E8E4DF',
    mapRoadCase: '#D1CBC0',
    mapBlock: '#F8F4EF',
    mapPark: '#E7F5DF',
    mapWater: '#D5E7F0',
    mapBuildingFill: '#F8F4EF',
    mapBuildingStroke: '#E8E4DF',
    mapLabelPrimary: '#6B6358',
    mapLabelSecondary: '#8B8275',

    // UI Background
    background: '#F4EDE1',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F4EF',

    // Text
    textPrimary: '#6B6358',
    textSecondary: '#8B8275',
    textTertiary: '#B8AEA3',

    // Border
    border: '#E8E4DF',
    borderLight: '#F0EDE8',

    // Accent — Teal navbar
    accentPrimary: '#7BAFC2',
    accentDark: '#6A9AAC',
    accentLight: '#A1C5D4',

    // Category Pin Colors (Pastels)
    pinBakery: '#EF8A7E',
    pinCoffee: '#7BAFC2',
    pinDesserts: '#FFB5CC',
    pinFreshProduce: '#A5D2A1',
    pinMeatFish: '#E89B9B',
    pinHotMeals: '#EDAD72',
    pinPizza: '#E5C26B',
    pinHealthy: '#8FD69F',
    pinDrinks: '#88A8B9',
    pinPreparedMeals: '#C9A988',
    pinSnacks: '#F5C17A',
    pinGrocery: '#B8A49C',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 2px 6px rgba(0, 0, 0, 0.06)',
    lg: '0 4px 12px rgba(0, 0, 0, 0.08)',
    xl: '0 6px 20px rgba(0, 0, 0, 0.10)',
  },

  // Border radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
  },

  // Typography
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '15px',
      lg: '17px',
      xl: '20px',
      '2xl': '24px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
};

// Tailwind config extension
export const tailwindLightModeExtension = {
  theme: {
    extend: {
      colors: {
        'light-bg': '#F4EDE1',
        'light-surface': '#FFFFFF',
        'light-text': '#6B6358',
        'light-text-secondary': '#8B8275',
        'light-border': '#E8E4DF',
        'light-accent': '#7BAFC2',
        'light-accent-dark': '#6A9AAC',
      },
      boxShadow: {
        'light-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'light-md': '0 2px 6px rgba(0, 0, 0, 0.06)',
        'light-lg': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
    },
  },
};

// CSS Variables version (for dynamic theming)
export const lightModeCSSVars = `
:root[data-theme="light"] {
  --color-bg: #F4EDE1;
  --color-surface: #FFFFFF;
  --color-text-primary: #6B6358;
  --color-text-secondary: #8B8275;
  --color-border: #E8E4DF;
  --color-accent: #7BAFC2;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.08);
  --radius-md: 12px;
  --radius-xl: 20px;
}
`;
