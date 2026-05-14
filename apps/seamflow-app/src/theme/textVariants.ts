import { responsiveScreenFontSize, responsiveScreenWidth } from "react-native-responsive-dimensions";



//Simplified responsive font size calculation
export const getResponsiveFontSizes = (percentage: number) => {
  return responsiveScreenFontSize(percentage);
};


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

// Base styles to reduce redundancy
const baseTitle = {
  fontFamily: "Poppins_700Bold",
  fontWeight: "bold",
  color: "text",
};

const baseBody = {
  fontFamily: "Poppins_400Regular",
  color: "text",
};

export const textVariants = {
  // Default text variant
  defaults: {
    ...baseBody,
  },

//  Titles
  // HL: {
  //   ...baseTitle,
  //   fontSize: getResponsiveFontSizes(4.8), // Largest title (H1)
  //   lineHeight: 48,
  // },
  H1: {
    ...baseTitle,
    fontSize: getResponsiveFontSizes(4.2),
    lineHeight: 40,
  },
  H2: {
    ...baseTitle,
    fontSize: getResponsiveFontSizes(3.6),
    lineHeight: 36,
  },
  H3: {
    ...baseTitle,
    fontSize: getResponsiveFontSizes(3.2),
    lineHeight: 30,
  },
  H4: {
    ...baseTitle,
    fontSize: getResponsiveFontSizes(2.6),
    lineHeight: 28,
  },
  H5: {
    ...baseTitle,
    fontSize: getResponsiveFontSizes(2.5),
    lineHeight: 24,
  },
  H6: {
    ...baseTitle,
    fontSize: getResponsiveFontSizes(2),
    lineHeight: 24,
  },

  // Body text
  bodyL: {
    ...baseBody,
    fontSize: getResponsiveFontSizes(3),
    lineHeight: 26,
  },
  body1: {
    ...baseBody,
    fontSize: getResponsiveFontSizes(2.5),
    lineHeight: 26,
  },

  //typically used for our paragraph
  body2: {
    ...baseBody,
    fontSize: getResponsiveFontSizes(2.1),
    lineHeight: 24,
  },


  //typically used for appending text maybe, images, and other elements in a section. 
  body3: {
    ...baseBody,
    fontSize: getResponsiveFontSizes(1.8),
    lineHeight: 20,
  },
  body4: {
    ...baseBody,
    fontSize: getResponsiveFontSizes(1.6),
    lineHeight: 20,
  },

  body5: {
    ...baseBody,
    fontSize: getResponsiveFontSizes(1.47),
    lineHeight: 20,
  },


  // GLOBAL STYLE FROM BOSS 


  // TYPICALLY USED AT THE TOP OF THE PAGE
  

  HL: { 

    fontFamily: 'Poppins_700Bold', 
    fontWeight: 'bold', 
    fontSize: getResponsiveFontSize(3.8, 4.2, 4.6), // increased by 0.4 for each step
    lineHeight: 50, // increased from 44 to 50
    color: 'text', 
  },

 

  // Title 1 (Apple HIG ~28pt) 

  // For top-level headings 

  title1: { 

    fontFamily: 'Poppins_700Bold', 

    fontWeight: 'bold', 

    fontSize: getResponsiveFontSize(3.0, 3.3, 3.6), 

    lineHeight: 40, 

    color: 'text', 

  }, 

 

  // Title 2 (Apple HIG ~22pt) 

  title2: { 

    fontFamily: 'Poppins_700Bold', 

    fontWeight: 'bold', 

    fontSize: getResponsiveFontSize(2.4, 2.6, 2.8), 

    lineHeight: 32, 

    color: 'text', 

  }, 

 

  // Title 3 (Apple HIG ~20pt) 

  //TYPICALLY USED IN THE SECTION HEADER AND THE SUB HEADERS ON PAGES. 
  title3: { 

    fontFamily: 'Poppins_700Bold', 

    fontWeight: 'bold', 

    fontSize: getResponsiveFontSize(2.2, 2.4, 2.6), 

    lineHeight: 28, 

    color: 'text', 

  }, 

 

  // Headline (Apple HIG ~17pt) 

  headline: { 

    fontFamily: 'Poppins_700Bold', 

    fontWeight: 'bold', 

    fontSize: getResponsiveFontSize(1.9, 2.0, 2.3), 

    lineHeight: 24, 

    color: 'text', 

  }, 

 

  // Body (Apple HIG ~17pt) 

  // For normal paragraph text 

  body: { 

    fontFamily: 'Poppins_400Regular', 
    fontSize: getResponsiveFontSize(1.7, 1.8, 2.0), // Adjusted for closer alignment to Apple's body font size (~17pt)
    lineHeight: 22, // Proportional to the font size
    color: 'text',

  }, 

 

  // Subhead (Apple HIG ~15pt) 

  subhead: { 

    fontFamily: 'Poppins_400Regular', 

    fontSize: getResponsiveFontSize(1.7, 1.8, 2.0), 

    lineHeight: 22, 

    color: 'text', 

  }, 

 

  // Footnote (Apple HIG ~13pt) 

  footnote: { 

    fontFamily: 'Poppins_400Regular', 

    fontSize: getResponsiveFontSize(1.4, 1.5, 1.6), 

    lineHeight: 20, 

    color: 'text', 

  }, 




//ENDS HERE. 


  // Button text
  button: {
    fontFamily: "Poppins_700Bold",
    fontSize: getResponsiveFontSize(1.4, 1.5, 1.6), 
    color: "mainBlue",
    fontWeight: "bold",
    
  },
  // textButton: {
  //   fontSize: getResponsiveFontSize(1.2),
  //   color: "mainGreen",
  // },

  // // Links and common text
  // linkText: {
  //   fontSize: getResponsiveFontSize(1.5),
  //   color: "mainGreen",
  // },
  // commonText: {
  //   fontSize: getResponsiveFontSize(2.7),
  // },

  // // Headers
  // header: {
  //   fontSize: getResponsiveFontSize(2.4),
  // },
  // headerSmall: {
  //   fontSize: getResponsiveFontSize(1.7),
  // },

  // // Small body text
  // bodySmall: {
  //   fontSize: getResponsiveFontSize(1.2),
  // },
};
