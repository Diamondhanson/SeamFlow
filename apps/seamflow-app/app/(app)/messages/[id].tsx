// Tailor side of one conversation — a thin wrapper over the shared ChatThread.
// See components/chat/ChatThread.tsx for the whole implementation.
import { router, useLocalSearchParams } from 'expo-router';
import { ChatThread } from '../../../components/chat/ChatThread';

export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ChatThread
      conversationId={id}
      role="tailor"
      ns="chat"
      onViewOrder={(orderId) => router.push({ pathname: '/(app)/orders/[id]', params: { id: orderId } })}
      onCreateQuote={() => router.push({ pathname: '/(app)/messages/quote', params: { id } })}
      onStartOrder={({ clientId, setId }) =>
        router.push({
          pathname: '/(app)/new-order',
          // The client is known and the numbers are saved, so the wizard opens
          // on the garment step with both already filled in.
          params: { forClient: clientId, fromSet: setId },
        })
      }
    />
  );
}
