export const theme = {
  radius: {
    sm: '12px',
    md: '16px',
    lg: '22px',
  },
  blur: {
    glass: '18px',
  },
  border: {
    glass: '1px solid rgba(255,255,255,0.08)',
  },
  shadow: {
    card: '0 12px 32px rgba(0,0,0,0.45)',
    glow: '0 0 24px rgba(96,165,250,0.18)',
  },
  gap: '12px',
  padding: {
    screen: '16px',
  },
  colors: {
    dark: {
      bg: 'linear-gradient(135deg, #09111e 0%, #0f1a2d 100%)',
      card: 'rgba(17, 26, 41, 0.78)',
      border: 'rgba(255,255,255,0.10)',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.68)',
      primary: '#60a5fa',
      secondary: '#3b82f6',
      accent: '#93c5fd',
      accentGreen: '#38bdf8',
      accentPurple: '#7dd3fc',
      accentRed: '#60a5fa',
      accentGold: '#bfdbfe',
    },
  },
  gradients: {
    primary: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    secondary: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
    accent: 'linear-gradient(135deg, #7dd3fc 0%, #3b82f6 100%)',
    glass: 'linear-gradient(135deg, rgba(96,165,250,0.16) 0%, rgba(30,64,175,0.12) 100%)',
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
