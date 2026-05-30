// Thin adapter → Atelier `Card`. Screens still importing from here pick up the
// Atelier surface (Inter typography, soft radius, scale-on-press) with no
// changes. The only app-side concern this keeps is the list-item bottom margin
// that callers relied on the old Card to provide.
import {
  Card as AtelierCard,
  CardTitle as AtelierCardTitle,
  CardLine as AtelierCardLine,
  type CardProps,
} from '@seamflow/ui';
import { spacing } from '../lib/theme';

export function Card({ style, ...rest }: CardProps) {
  return <AtelierCard style={[{ marginBottom: spacing.md }, style]} {...rest} />;
}

export const CardTitle = AtelierCardTitle;
export const CardLine = AtelierCardLine;
