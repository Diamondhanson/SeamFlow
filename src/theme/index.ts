import { createTheme } from "@shopify/restyle";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textVariants } from "../theme/textVariants";
import { font } from "../theme/font";

// Professional Craft Aesthetic Theme
const theme = createTheme({
  colors,
  spacing,
  textVariants,
  font,
  
  // Border radius system
  borderRadii: {
    none: 0,
    xs: 2,
    s: 4,
    m: 8,
    l: 12,
    xl: 16,
    xxl: 24,
    round: 999,
  },
  
  // Legacy support for existing borderRadius
  borderRadius: {
    none: 0,
    s: 4,
    m: 8,
    l: 12,
    xl: 16,
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    phone: 0,
    tablet: 768,
    desktop: 1024,
  },
  
  // Elevation/Shadow system
  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    s: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    m: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 4,
    },
    l: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 16,
    },
  },
  
  // Component-specific styling
  components: {
    // Card styling
    card: {
      backgroundColor: 'surface',
      borderRadius: 'l',
      padding: 'card',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    
    // Button styling
    button: {
      primary: {
        backgroundColor: 'primary',
        borderRadius: 'm',
        paddingVertical: 'button',
        paddingHorizontal: 'xl',
        minHeight: 48,
      },
      secondary: {
        backgroundColor: 'surface',
        borderColor: 'border',
        borderWidth: 1,
        borderRadius: 'm',
        paddingVertical: 'button',
        paddingHorizontal: 'xl',
        minHeight: 48,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderRadius: 'm',
        paddingVertical: 'button',
        paddingHorizontal: 'xl',
        minHeight: 48,
      },
    },
    
    // Input field styling
    input: {
      backgroundColor: 'surfaceElevated',
      borderColor: 'border',
      borderWidth: 1,
      borderRadius: 'm',
      paddingVertical: 'input',
      paddingHorizontal: 'input',
      minHeight: 48,
      fontSize: 16, // Prevent zoom on iOS
    },
    
    // Header styling
    header: {
      backgroundColor: 'background',
      borderBottomColor: 'border',
      borderBottomWidth: 1,
      height: 'headerHeight',
      paddingHorizontal: 'page',
    },
  },
  
  // Animation timing
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Z-index system
  zIndices: {
    background: -1,
    default: 0,
    content: 1,
    header: 10,
    overlay: 20,
    modal: 30,
    toast: 40,
    tooltip: 50,
  },
});

type ThemeProps = typeof theme;

// Default component styles for consistent application
const defaultStyles = {
  // Common padding patterns
  paddingAround: {
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.m,
    paddingLeft: theme.spacing.m,
    paddingRight: theme.spacing.m,
  },
  
  // Common margin patterns
  marginAround: {
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.l,
    marginLeft: theme.spacing.l,
    marginRight: theme.spacing.l,
  },
  
  // Page container
  pageContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.page,
  },
  
  // Safe area container
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Card container
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadii.l,
    padding: theme.spacing.card,
    marginBottom: theme.spacing.cardGap,
    ...theme.elevation.s,
  },
  
  // Form field
  formField: {
    marginBottom: theme.spacing.fieldGap,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadii.m,
    paddingVertical: theme.spacing.button,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.elevation.s,
  },
  
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadii.m,
    paddingVertical: theme.spacing.button,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Input field
  inputField: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadii.m,
    paddingVertical: theme.spacing.input,
    paddingHorizontal: theme.spacing.input,
    minHeight: 48,
    fontSize: 16,
    color: theme.colors.text,
  },
  
  // Header
  header: {
    backgroundColor: theme.colors.background,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    height: theme.spacing.headerHeight,
    paddingHorizontal: theme.spacing.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Shadow presets
  shadowSmall: theme.elevation.s,
  shadowMedium: theme.elevation.m,
  shadowLarge: theme.elevation.l,
};

// Utility functions for theme
const themeUtils = {
  // Get responsive value based on screen size
  getResponsiveValue: (phone: any, tablet: any, desktop?: any) => {
    // This would need to be implemented with a responsive hook
    return phone; // Default to phone for now
  },
  
  // Get elevation style
  getElevation: (level: keyof typeof theme.elevation) => {
    return theme.elevation[level];
  },
  
  // Get spacing value
  getSpacing: (key: keyof typeof theme.spacing) => {
    return theme.spacing[key];
  },
};

export { theme, ThemeProps, defaultStyles, themeUtils };


