export const theme = {
  radius: {
    sm: '12px',
    md: '18px',
    lg: '26px',
  },
  blur: {
    glass: '20px',
  },
  border: {
    glass: '1px solid rgba(96,165,250,0.16)',
  },
  shadow: {
    card: '0 18px 44px rgba(0,0,0,0.48)',
    glow: '0 0 24px rgba(96,165,250,0.14)',
  },
  gap: '12px',
  padding: {
    screen: '16px',
  },
  colors: {
    dark: {
      bg: 'linear-gradient(180deg, #08070a 0%, #0f0d12 100%)',
      card: 'rgba(16, 15, 18, 0.88)',
      border: 'rgba(96,165,250,0.16)',
      text: '#f4f1ea',
      textSecondary: 'rgba(244,241,234,0.62)',
      primary: '#60a5fa',
      secondary: '#38bdf8',
      accent: '#bfdbfe',
      accentGreen: '#38bdf8',
      accentPurple: '#7dd3fc',
      accentRed: '#60a5fa',
      accentGold: '#bfdbfe',
    },
  },
  gradients: {
    primary: 'linear-gradient(180deg, #93c5fd 0%, #60a5fa 55%, #2563eb 100%)',
    secondary: 'linear-gradient(135deg, rgba(96,165,250,0.18) 0%, rgba(125,211,252,0.06) 100%)',
    accent: 'linear-gradient(135deg, #7dd3fc 0%, #60a5fa 100%)',
    glass: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(125,211,252,0.03) 100%)',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
  },
  zIndex: {
    drawer: 1000,
    overlay: 999,
    header: 100,
    content: 1,
  },
} as const;
