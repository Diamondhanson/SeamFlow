import { createBox, createRestyleComponent, createText, SpacingProps } from "@shopify/restyle";
import { ThemeProps } from "../theme";

export const Text = createText<ThemeProps>();
export const Box = createBox<ThemeProps>();


type ExtendedBoxProps = SpacingProps<ThemeProps>;
export const CustomBox = createRestyleComponent<
  ExtendedBoxProps,
  ThemeProps
>([], Box);