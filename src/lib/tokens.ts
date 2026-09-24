/**
 * LEASHED Design System - Global Tokens
 * 
 * Centralized design tokens establishing consistent colors, typography,
 * spacing, radii, elevation, and component presets for the application.
 */

export const tokens = {
  colors: {
    // Brand Core
    brand: {
      dark: '#131b15',        // Primary dark slate-forest for headers, nav, footer
      darkHover: '#0e1410',
      forest: '#1a2920',      // Deep forest green for feature bar & dark badges
      forestLight: '#24372c',
      forestBorder: '#293a30',
      sand: '#d9b589',        // Primary warm sand/gold CTA accent
      sandHover: '#cca272',
      sandLight: '#f6eee3',
      sandMuted: '#eeddc7',
      cream: '#fbf9f5',       // Primary page warm-white / parchment background
      creamAlt: '#f4efe6',
    },
    // Surface / Background
    surface: {
      page: '#fbf9f5',
      card: '#ffffff',
      cardAlt: '#f7f4ee',
      dark: '#131b15',
      darkSurface: '#18241c',
      overlay: 'rgba(19, 27, 21, 0.75)',
      overlayDark: 'rgba(12, 17, 13, 0.88)',
    },
    // Typography Colors
    text: {
      primary: '#161c18',     // High contrast dark for headings on light
      secondary: '#49574f',   // Readable body text on light
      muted: '#718076',       // Muted captions & secondary metadata on light
      inverse: '#ffffff',     // Primary text on dark surfaces
      inverseSecondary: '#ccd8d0', // Secondary text on dark surfaces
      inverseMuted: '#8b9c91',     // Muted text on dark surfaces
      accentGold: '#ebd4b0',  // Warm script text on dark overlays
      sandText: '#18140f',    // Dark text on sand buttons
    },
    // Borders & Separators
    border: {
      light: '#e8e4db',
      subtle: '#efece4',
      dark: '#26372c',
      darkSubtle: '#1d2a21',
      accent: '#d9b589',
    },
    // Semantic
    semantic: {
      success: '#2e7d32',
      warning: '#ed6c02',
      error: '#d32f2f',
      info: '#0288d1',
    },
  },

  typography: {
    fontFamily: {
      serif: 'var(--font-serif), "Playfair Display", Georgia, serif',
      sans: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      script: 'var(--font-script), "Caveat", cursive',
    },
    fontSize: {
      displayLarge: {
        fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)',
        lineHeight: '1.08',
        fontWeight: '700',
        letterSpacing: '-0.025em',
      },
      displayMedium: {
        fontSize: 'clamp(2rem, 4vw, 3rem)',
        lineHeight: '1.14',
        fontWeight: '700',
        letterSpacing: '-0.02em',
      },
      h1: {
        fontSize: 'clamp(1.75rem, 3vw, 2.35rem)',
        lineHeight: '1.2',
        fontWeight: '700',
        letterSpacing: '-0.015em',
      },
      h2: {
        fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)',
        lineHeight: '1.25',
        fontWeight: '700',
      },
      h3: {
        fontSize: '1.25rem',
        lineHeight: '1.35',
        fontWeight: '600',
      },
      bodyLarge: {
        fontSize: '1.125rem',
        lineHeight: '1.65',
        fontWeight: '400',
      },
      body: {
        fontSize: '1rem',
        lineHeight: '1.6',
        fontWeight: '400',
      },
      bodySmall: {
        fontSize: '0.875rem',
        lineHeight: '1.5',
        fontWeight: '400',
      },
      eyebrow: {
        fontSize: '0.75rem',
        lineHeight: '1.3',
        fontWeight: '700',
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
      },
      scriptCallout: {
        fontSize: 'clamp(1.5rem, 2.5vw, 2.15rem)',
        lineHeight: '1.15',
        fontFamily: 'var(--font-script), "Caveat", cursive',
      },
    },
  },

  radii: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    card: '0 4px 20px -2px rgba(22, 28, 24, 0.07)',
    cardHover: '0 12px 28px -4px rgba(22, 28, 24, 0.12)',
    floatingBadge: '0 4px 14px 0 rgba(0, 0, 0, 0.14)',
    buttonGlow: '0 4px 18px rgba(217, 181, 137, 0.35)',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  layout: {
    containerMaxWidth: '1360px',
    sectionPaddingY: 'clamp(4rem, 8vw, 6.5rem)',
    sectionPaddingX: 'clamp(1.25rem, 4vw, 3rem)',
  }
} as const;

export type DesignTokens = typeof tokens;
