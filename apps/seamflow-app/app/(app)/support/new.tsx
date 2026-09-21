import { useMemo } from 'react';
import { SupportNewTicket } from '../../../components/support/SupportNewTicket';
import { useOrders } from '../../../lib/queries';

export default function NewSupportTicket() {
  // The tailor's own orders, most recent first as the API returns them.
  const orders = useOrders();
  const options = useMemo(
    () => (orders.data?.items ?? []).map((o) => ({ id: o.id, name: o.orderName })),
    [orders.data],
  );
  return <SupportNewTicket side="tailor" basePath="/(app)/support" orders={options} />;
}
