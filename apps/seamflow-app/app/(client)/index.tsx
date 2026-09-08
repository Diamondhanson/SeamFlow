// The client experience opens on the discovery feed (browsable, no account).
import { Redirect, type Href } from 'expo-router';

export default function ClientIndex() {
  return <Redirect href={'/(client)/discover' as Href} />;
}
