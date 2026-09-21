import { useLocalSearchParams } from 'expo-router';
import { SupportThread } from '../../../components/support/SupportThread';

export default function SupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SupportThread id={id} />;
}
