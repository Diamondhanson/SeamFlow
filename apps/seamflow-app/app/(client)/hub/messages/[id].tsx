// Client side of one conversation — a thin wrapper over the shared ChatThread.
// See components/chat/ChatThread.tsx for the whole implementation.
import { router, useLocalSearchParams } from 'expo-router';
import { ChatThread } from '../../../../components/chat/ChatThread';

export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ChatThread
      conversationId={id}
      role="client"
      ns="cchat"
      onViewOrder={(orderId) => router.push({ pathname: '/hub/orders/[id]', params: { id: orderId } })}
    />
  );
}
