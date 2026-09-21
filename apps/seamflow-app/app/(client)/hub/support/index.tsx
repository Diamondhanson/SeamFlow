// Client side of Help & Support — see components/support/.
import { SupportTicketList } from '../../../../components/support/SupportTicketList';

export default function SupportTickets() {
  return <SupportTicketList basePath="/hub/support" />;
}
