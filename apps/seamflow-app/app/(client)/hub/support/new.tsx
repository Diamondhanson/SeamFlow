import { useMemo } from 'react';
import { SupportNewTicket } from '../../../../components/support/SupportNewTicket';
import { useConsumerOrders } from '../../../../lib/consumer-queries';

export default function NewSupportTicket() {
  // Orders this customer has claimed from a tailor's share link.
  const orders = useConsumerOrders();
  const options = useMemo(
    () =>
      (orders.data?.items ?? []).map((o) => ({
        id: o.id,
        name: `${o.orderName} · ${o.tailorBusinessName}`,
      })),
    [orders.data],
  );
  return <SupportNewTicket side="client" basePath="/hub/support" orders={options} />;
}
