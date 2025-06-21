import { responsiveScreenFontSize, responsiveScreenWidth } from "react-native-responsive-dimensions";
import { Platform } from "react-native";

// Simplified responsive font size calculation
export const getResponsiveFontSizes = (percentage: number) => {
  return responsiveScreenFontSize(percentage);
};

// Enhanced responsive font size calculation with better breakpoints
export const getResponsiveFontSize = (smallDevice: number, mediumDevice: number, largeDevice: number) => { 
  const screenWidth = responsiveScreenWidth(100); 
  if (screenWidth < 360) { 
    return responsiveScreenFontSize(smallDevice);    // Smaller devices 
  } else if (screenWidth < 768) { 
    return responsiveScreenFontSize(mediumDevice);   // Medium devices 
  } else { 
    return responsiveScreenFontSize(largeDevice);    // Larger devices 
  } 
};

// Professional Craft Aesthetic Typography System
// Inspired by luxury fashion brands and creative professional tools

const craftTypography = {
  // Primary font family for body text and UI
  primary: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  
  // Secondary font family for headings (more distinctive)
  secondary: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),
  
  // Monospace for measurements and technical data
  monospace: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
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
    fontSize: getResponsiveFontSize(4.5, 5.0, 5.5),
    lineHeight: 64,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },

  // Headings - Professional hierarchy
  h1: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(3.2, 3.6, 4.0),
    lineHeight: 44,
    fontWeight: "bold",
    letterSpacing: -0.3,
  },
  
  h2: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(2.6, 3.0, 3.2),
    lineHeight: 36,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  
  h3: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(2.2, 2.4, 2.6),
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  
  h4: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.9, 2.1, 2.3),
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: 0,
  },
  
  h5: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.7, 1.8, 2.0),
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: 0,
  },
  
  h6: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.5, 1.6, 1.8),
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Body Text - Optimized for readability
  bodyLarge: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.9, 2.0, 2.2),
    lineHeight: 28,
    fontWeight: "400",
  },
  
  body: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.7, 1.8, 2.0),
    lineHeight: 24,
    fontWeight: "400",
  },
  
  bodySmall: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.5, 1.6, 1.8),
    lineHeight: 22,
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

  // Interactive Elements
  button: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.6, 1.7, 1.9),
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "none",
  },
  
  buttonLarge: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.8, 1.9, 2.1),
    lineHeight: 22,
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

  // Legacy Support (gradually migrate away from these)
  // Keeping for backward compatibility during redesign
  H1: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(3.2, 3.6, 4.0),
    lineHeight: 44,
    fontWeight: "bold",
  },
  H2: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(2.6, 3.0, 3.2),
    lineHeight: 36,
    fontWeight: "600",
  },
  H3: {
    ...craftBase.heading,
    fontSize: getResponsiveFontSize(2.2, 2.4, 2.6),
    lineHeight: 30,
    fontWeight: "600",
  },
  H4: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.9, 2.1, 2.3),
    lineHeight: 26,
    fontWeight: "600",
  },
  H5: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.7, 1.8, 2.0),
    lineHeight: 24,
    fontWeight: "600",
  },
  H6: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.5, 1.6, 1.8),
    lineHeight: 22,
    fontWeight: "600",
  },
  body1: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.8, 1.9, 2.1),
    lineHeight: 26,
    fontWeight: "400",
  },
  body2: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.6, 1.7, 1.9),
    lineHeight: 24,
    fontWeight: "400",
  },
  body3: {
    ...craftBase.primary,
    fontSize: getResponsiveFontSize(1.4, 1.5, 1.7),
    lineHeight: 20,
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
