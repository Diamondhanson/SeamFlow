// Professional Craft Aesthetic Spacing System
// Based on 8pt grid with additional refinements for luxury feel

export const spacing = {
  // Base spacing units (8pt grid)
  none: 0,
  xs: 4,    // 0.25rem - Tight spacing for elements that need to be close
  s: 8,     // 0.5rem - Small spacing for related elements
  sm: 12,   // 0.75rem - Small-medium for compact layouts
  m: 16,    // 1rem - Standard spacing (base unit)
  ml: 20,   // 1.25rem - Medium-large for comfortable spacing
  l: 24,    // 1.5rem - Large spacing for sections
  xl: 32,   // 2rem - Extra large for major sections
  xxl: 48,  // 3rem - Double extra large for hero sections
  xxxl: 64, // 4rem - Triple extra large for dramatic spacing
  huge: 96, // 6rem - Huge spacing for landing pages

  // Semantic spacing for specific use cases
  component: 16,      // Standard spacing within components
  section: 24,        // Between major sections
  page: 20,          // Page padding (comfortable for mobile)
  pageTablet: 32,    // Page padding for tablets
  card: 16,          // Internal card padding
  cardGap: 12,       // Gap between cards
  listItem: 12,      // Spacing within list items
  input: 16,         // Input field padding
  button: 16,        // Button padding
  buttonGap: 12,     // Gap between buttons
  
  // Layout spacing
  headerHeight: 56,   // Standard header height
  tabBarHeight: 60,   // Tab bar height
  fabSize: 56,       // Floating action button size
  avatarSmall: 32,   // Small avatar size
  avatarMedium: 48,  // Medium avatar size
  avatarLarge: 64,   // Large avatar size
  
  // Form and input spacing
  fieldGap: 16,      // Gap between form fields
  fieldPadding: 16,  // Internal field padding
  labelGap: 8,       // Gap between label and input
  helpTextGap: 4,    // Gap between input and help text
  
  // Border radius values
  borderRadius: {
    none: 0,
    xs: 2,           // Subtle rounding
    s: 4,            // Small rounding for buttons
    m: 8,            // Medium rounding (most common)
    l: 12,           // Large rounding for cards
    xl: 16,          // Extra large for prominent elements
    xxl: 24,         // Double extra large for hero elements
    round: 999,      // Fully rounded (for circles)
  },
  
  // Shadow depths (for elevation)
  shadow: {
    none: 0,
    xs: 1,           // Subtle shadow
    s: 2,            // Small shadow for buttons
    m: 4,            // Medium shadow for cards
    l: 8,            // Large shadow for modals
    xl: 16,          // Extra large shadow for floating elements
  },
}