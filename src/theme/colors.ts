import { Platform, Appearance } from "react-native";

// Professional Craft Aesthetic Color Palette
const palette = {
  // Primary - Deep Navy (Professional, Trustworthy)
  navy50: '#f0f4ff',
  navy100: '#e0e7ff',
  navy200: '#c7d2fe',
  navy300: '#a5b4fc',
  navy400: '#818cf8',
  navy500: '#6366f1',
  navy600: '#4f46e5',
  navy700: '#4338ca',    // Primary
  navy800: '#3730a3',
  navy900: '#312e81',
  navy950: '#1e1b4b',

  // Secondary - Warm Gold (Luxury, Craftsmanship)
  gold50: '#fefdf8',
  gold100: '#fef9e7',
  gold200: '#fef2cd',
  gold300: '#fde68a',
  gold400: '#fcd34d',
  gold500: '#f59e0b',
  gold600: '#d97706',      // Secondary
  gold700: '#b45309',
  gold800: '#92400e',
  gold900: '#78350f',

  // Accent - Sage Green (Natural, Calming)
  sage50: '#f7f8f7',
  sage100: '#e8f5e8',
  sage200: '#d4e6d4',
  sage300: '#a7d4a7',
  sage400: '#82c882',
  sage500: '#5a9b5a',     // Accent
  sage600: '#4a8c4a',
  sage700: '#3d7a3d',
  sage800: '#2f5f2f',
  sage900: '#1f4a1f',

  // Neutrals - Warm grays with cream undertones
  neutral50: '#fafaf9',
  neutral100: '#f5f5f4',
  neutral200: '#e7e5e4',
  neutral300: '#d6d3d1',
  neutral400: '#a8a29e',
  neutral500: '#78716c',
  neutral600: '#57534e',
  neutral700: '#44403c',
  neutral800: '#292524',
  neutral900: '#1c1917',
  neutral950: '#0c0a09',

  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Pure colors
  white: '#ffffff',
  black: '#000000',
};

// Get device appearance preference
const getDeviceTheme = () => {
  return Appearance.getColorScheme() || 'light';
};

// Theme-aware color system
const createThemeColors = (isDark: boolean) => ({
  // Core Brand Colors
  primary: isDark ? palette.navy400 : palette.navy700,
  primaryLight: isDark ? palette.navy300 : palette.navy600,
  primaryDark: isDark ? palette.navy500 : palette.navy800,
  
  secondary: isDark ? palette.gold400 : palette.gold600,
  secondaryLight: isDark ? palette.gold300 : palette.gold500,
  secondaryDark: isDark ? palette.gold500 : palette.gold700,
  
  accent: isDark ? palette.sage400 : palette.sage500,
  accentLight: isDark ? palette.sage300 : palette.sage400,
  accentDark: isDark ? palette.sage500 : palette.sage600,

  // Background System
  background: isDark ? palette.neutral950 : palette.neutral50,
  backgroundElevated: isDark ? palette.neutral900 : palette.white,
  backgroundSecondary: isDark ? palette.neutral800 : palette.neutral100,
  backgroundTertiary: isDark ? palette.neutral700 : palette.neutral200,
  
  // Surface System (for cards, modals, etc.)
  surface: isDark ? palette.neutral900 : '#f5f0fc',
  surfaceElevated: isDark ? palette.neutral800 : palette.neutral50,
  surfaceSecondary: isDark ? palette.neutral700 : palette.neutral100,
  
  // Text System
  text: isDark ? palette.neutral100 : palette.neutral900,
  textSecondary: isDark ? palette.neutral300 : palette.neutral700,
  textTertiary: isDark ? palette.neutral400 : palette.neutral500,
  textInverse: isDark ? palette.neutral900 : palette.neutral100,
  textOnPrimary: palette.white,
  textOnSecondary: palette.neutral900,
  textOnAccent: palette.white,
  
  // Border System
  border: isDark ? palette.neutral700 : palette.neutral300,
  borderLight: isDark ? palette.neutral800 : palette.neutral200,
  borderHeavy: isDark ? palette.neutral600 : palette.neutral400,
  
  // Interactive States
  interactive: isDark ? palette.navy400 : palette.navy700,
  interactiveHover: isDark ? palette.navy300 : palette.navy800,
  interactivePressed: isDark ? palette.navy500 : palette.navy900,
  interactiveDisabled: isDark ? palette.neutral600 : palette.neutral400,
  
  // Semantic Colors
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
  
  // Status Colors for Orders
  statusRegistered: isDark ? palette.neutral400 : palette.neutral600,
  statusInProgress: isDark ? palette.gold400 : palette.gold600,
  statusTesting: isDark ? palette.sage400 : palette.sage600,
  statusDelivered: isDark ? palette.success : palette.success,
  statusPaused: isDark ? palette.neutral500 : palette.neutral500,
  
  // Specialty Colors
  cardShadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
  overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
  divider: isDark ? palette.neutral700 : palette.neutral200,
  
  // Legacy support (for gradual migration)
  mainText: isDark ? palette.neutral100 : palette.neutral900,
  subText: isDark ? palette.neutral400 : palette.neutral600,
  backgroundLight: isDark ? palette.neutral800 : palette.neutral100,
});

// Initialize with device preference
let isDarkMode = getDeviceTheme() === 'dark';

// Create initial color scheme
export const colors = createThemeColors(isDarkMode);

// Function to update colors based on appearance change
export const updateColorsForTheme = (colorScheme: 'light' | 'dark') => {
  isDarkMode = colorScheme === 'dark';
  const newColors = createThemeColors(isDarkMode);
  
  // Update the colors object
  Object.assign(colors, newColors);
  
  return newColors;
};

// Export palette for direct access when needed
export { palette };

// Export theme detection utilities
export const themeUtils = {
  getDeviceTheme,
  isDarkMode: () => isDarkMode,
  createThemeColors,
};

// Listen for appearance changes
if (Platform.OS !== 'web') {
  Appearance.addChangeListener(({ colorScheme }) => {
    updateColorsForTheme(colorScheme || 'light');
  });
}