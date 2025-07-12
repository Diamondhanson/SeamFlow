import { responsiveScreenFontSize, responsiveScreenWidth } from "react-native-responsive-dimensions";
import { Platform } from "react-native";

/**
 * RESPONSIVE TYPOGRAPHY SYSTEM - OPTIMIZED FOR TABLETS
 * 
 * Key improvements for tablet rendering:
 * - Uses absolute font sizes instead of screen percentages for tablets (768px+)
 * - Better Android font family selection (Roboto variants)
 * - Improved font weights for tablet readability
 * - Conservative scaling to prevent oversized fonts on large screens
 * 
 * Breakpoints:
 * - < 360px: Small phones
 * - 360px - 768px: Regular phones
 * - 768px - 1024px: Small tablets (0.7x scaling)
 * - 1024px+: Large tablets (0.6x scaling)
 */

// Simplified responsive font size calculation (legacy - use sparingly)
export const getResponsiveFontSizes = (percentage: number) => {
  return responsiveScreenFontSize(percentage);
};

// Tablet-optimized font weights for Android
export const getOptimizedFontWeight = (weight: string) => {
  const screenWidth = responsiveScreenWidth(100);
  
  if (Platform.OS === 'android' && screenWidth >= 768) {
    // Android tablets benefit from slightly heavier weights for better readability
    switch (weight) {
      case '400':
        return '500';
      case '500':
        return '600';
      case '600':
        return '700';
      default:
        return weight;
    }
  }
  
  return weight;
};

// Enhanced responsive font size calculation with better tablet support
export const getResponsiveFontSize = (smallDevice: number, mediumDevice: number, tabletDevice: number) => { 
  const screenWidth = responsiveScreenWidth(100); 
  
  if (screenWidth < 360) { 
    // Small phones
    return responsiveScreenFontSize(smallDevice);
  } else if (screenWidth < 768) { 
    // Regular phones and large phones
    return responsiveScreenFontSize(mediumDevice);
  } else if (screenWidth < 1024) {
    // Small tablets - use fixed sizes instead of percentages
    return tabletDevice * 0.7; // Scale down for better readability
  } else { 
    // Large tablets - use even more conservative fixed sizes
    return tabletDevice * 0.6; 
  } 
};

// Alternative function for absolute font sizes on larger screens
export const getAbsoluteFontSize = (phone: number, tablet: number) => {
  const screenWidth = responsiveScreenWidth(100);
  
  if (screenWidth < 768) {
    return phone;
  } else {
    return tablet;
  }
};

// Professional Craft Aesthetic Typography System
// Inspired by luxury fashion brands and creative professional tools

const craftTypography = {
  // Primary font family for body text and UI - optimized for Android tablets
  primary: Platform.select({
    ios: 'System',
    android: 'Roboto-Regular',
    default: 'System',
  }),
  
  // Secondary font family for headings (more distinctive)
  secondary: Platform.select({
    ios: 'Georgia',
    android: 'Roboto-Medium', // Better than generic serif on Android
    default: 'serif',
  }),
  
  // Monospace for measurements and technical data
  monospace: Platform.select({
    ios: 'Menlo',
    android: 'Roboto-Mono',
    default: 'monospace',
  }),
};

// Base styles with craft aesthetic principles
const craftBase = {
  primary: {
    fontFamily: craftTypography.primary,
    color: "text",
    letterSpacing: 0.2,
  },
  
  heading: {
    fontFamily: craftTypography.secondary,
    color: "text",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  
  technical: {
    fontFamily: craftTypography.monospace,
    color: "textSecondary",
    fontWeight: "400",
  },
};

export const textVariants = {
  // Default text variant
  defaults: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSizes(1.8),
    lineHeight: 22,
  },

  // Display Typography (for hero sections, welcome screens)
  display: {
    ...craftBase.heading,
    fontSize: getAbsoluteFontSize(36, 48),
    lineHeight: getAbsoluteFontSize(44, 56),
    fontWeight: "bold",
    letterSpacing: -0.5,
  },

  // Headings - Professional hierarchy with better tablet support
  h1: {
    ...craftBase.heading,
    fontSize: getAbsoluteFontSize(32, 40),
    lineHeight: getAbsoluteFontSize(40, 48),
    fontWeight: "bold",
    letterSpacing: -0.3,
  },
  
  h2: {
    ...craftBase.heading,
    fontSize: getAbsoluteFontSize(26, 32),
    lineHeight: getAbsoluteFontSize(32, 40),
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  
  h3: {
    ...craftBase.heading,
    fontSize: getAbsoluteFontSize(22, 28),
    lineHeight: getAbsoluteFontSize(28, 36),
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  
  h4: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(20, 24),
    lineHeight: getAbsoluteFontSize(24, 30),
    fontWeight: "600",
    letterSpacing: 0,
  },
  
  h5: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(18, 22),
    lineHeight: getAbsoluteFontSize(22, 28),
    fontWeight: "600",
    letterSpacing: 0,
  },
  
  h6: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(16, 20),
    lineHeight: getAbsoluteFontSize(20, 26),
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Body Text - Optimized for readability on all devices
  bodyLarge: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(18, 20),
    lineHeight: getAbsoluteFontSize(26, 28),
    fontWeight: "400",
  },
  
  body: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(16, 18),
    lineHeight: getAbsoluteFontSize(22, 24),
    fontWeight: "400",
  },
  
  bodySmall: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(14, 16),
    lineHeight: getAbsoluteFontSize(20, 22),
    fontWeight: "400",
    color: "textSecondary",
  },
  
  // Technical/Data Typography (for measurements, numbers)
  technical: {
    ...craftBase.technical,
    fontSize: getResponsiveFontSize(1.6, 1.7, 1.9),
    lineHeight: 22,
    fontWeight: "500",
  },
  
  technicalLarge: {
    ...craftBase.technical,
    fontSize: getResponsiveFontSize(2.0, 2.2, 2.4),
    lineHeight: 28,
    fontWeight: "600",
  },

  // Interactive Elements - Better tablet support
  button: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(16, 18),
    lineHeight: getAbsoluteFontSize(20, 22),
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "none",
  },
  
  buttonLarge: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(18, 20),
    lineHeight: getAbsoluteFontSize(22, 24),
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  
  link: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.7, 1.8, 2.0),
    lineHeight: 24,
    fontWeight: "500",
    color: "primary",
    textDecorationLine: "underline",
  },

  // Labels and Captions
  label: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.4, 1.5, 1.6),
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: "textSecondary",
  },
  
  caption: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.3, 1.4, 1.5),
    lineHeight: 16,
    fontWeight: "400",
    color: "textTertiary",
  },
  
  // Navigation and UI Elements
  tabLabel: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.4, 1.5, 1.6),
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  
  navigationTitle: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(2.0, 2.2, 2.4),
    lineHeight: 28,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  // Status and Tags
  tag: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.2, 1.3, 1.4),
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  
  status: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.3, 1.4, 1.5),
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // Legacy Support with improved tablet rendering
  // Keeping for backward compatibility during redesign
  H1: {
    ...craftBase.heading,
    fontSize: getAbsoluteFontSize(32, 40),
    lineHeight: getAbsoluteFontSize(40, 48),
    fontWeight: "bold",
  },
  H2: {
    ...craftBase.heading,
    fontSize: getAbsoluteFontSize(26, 32),
    lineHeight: getAbsoluteFontSize(32, 40),
    fontWeight: "600",
  },
  H3: {
    ...craftBase.heading,
    fontSize: getAbsoluteFontSize(22, 28),
    lineHeight: getAbsoluteFontSize(28, 36),
    fontWeight: "600",
  },
  H4: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(20, 24),
    lineHeight: getAbsoluteFontSize(24, 30),
    fontWeight: "600",
  },
  H5: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(18, 22),
    lineHeight: getAbsoluteFontSize(22, 28),
    fontWeight: "600",
  },
  H6: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(16, 20),
    lineHeight: getAbsoluteFontSize(20, 26),
    fontWeight: "600",
  },
  body1: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(16, 18),
    lineHeight: getAbsoluteFontSize(22, 24),
    fontWeight: "400",
  },
  body2: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(14, 16),
    lineHeight: getAbsoluteFontSize(20, 22),
    fontWeight: "400",
  },
  body3: {
    ...craftBase.primary,
    fontSize: getAbsoluteFontSize(12, 14),
    lineHeight: getAbsoluteFontSize(18, 20),
    fontWeight: "400",
    color: "textSecondary",
  },
  
  // Keep some of the existing variants for compatibility
  title1: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(3.0, 3.3, 3.6),
    lineHeight: 40,
    fontWeight: "bold",
  },
  title2: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(2.4, 2.6, 2.8),
    lineHeight: 32,
    fontWeight: "600",
  },
  title3: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(2.2, 2.4, 2.6),
    lineHeight: 28,
    fontWeight: "600",
  },
  headline: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.9, 2.0, 2.3),
    lineHeight: 24,
    fontWeight: "600",
  },
  subhead: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.7, 1.8, 2.0),
    lineHeight: 22,
    fontWeight: "400",
    color: "textSecondary",
  },
  footnote: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.4, 1.5, 1.6),
    lineHeight: 20,
    fontWeight: "400",
    color: "textTertiary",
  },
};

// Export font families for direct use in custom components
export const fontFamilies = craftTypography;
