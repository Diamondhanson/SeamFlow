import { createTheme } from "@shopify/restyle";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textVariants } from "../theme/textVariants";
import { font } from "../theme/font";


const theme = createTheme({
    colors,
    spacing,
    textVariants,borderRadius: {
      none: 0,
      s: 4,
      m: 8,
      l: 12,
      xl: 16,
  },
    font,borderRadii: {
        none: 0,
        s: 4,
        m: 8,
        l: 12,
        xl: 16,
    },
    breakpoints: {
        phone: 0,
        tablet: 768,
    },

});

type ThemeProps = typeof theme;
const defaultStyles = {
    paddingAround: {
      paddingTop: theme.spacing.m,
      paddingBottom: theme.spacing.m,
      paddingLeft: theme.spacing.m,
      paddingRight: theme.spacing.m,
    },
    marginAround: {
      marginTop: theme.spacing.l,
      marginBottom: theme.spacing.l,
      marginLeft: theme.spacing.l,
      marginRight: theme.spacing.l,
    },
  };
  
export {theme,ThemeProps,defaultStyles}


