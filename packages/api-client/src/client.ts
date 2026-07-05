import { HttpClient, type HttpConfig } from './http';
import { makeHealthResource, type HealthResource } from './resources/health';
import { makeMeResource, type MeResource } from './resources/me';
import { makeTailorsResource, type TailorsResource } from './resources/tailors';
import { makeClientsResource, type ClientsResource } from './resources/clients';
import {
  makeMeasurementSetsResource,
  type MeasurementSetsResource,
} from './resources/measurement-sets';
import {
  makeMeasurementTemplatesResource,
  type MeasurementTemplatesResource,
} from './resources/measurement-templates';
import {
  makeGroupOrdersResource,
  type GroupOrdersResource,
} from './resources/group-orders';
import {
  makeGroupOrderMembersResource,
  type GroupOrderMembersResource,
} from './resources/group-order-members';
import { makeOrdersResource, type OrdersResource } from './resources/orders';
import {
  makeOrderItemsResource,
  type OrderItemsResource,
} from './resources/order-items';
import {
  makeOrderPhotosResource,
  type OrderPhotosResource,
} from './resources/order-photos';
import { makeDesignsResource, type DesignsResource } from './resources/designs';
import { makeAiResource, type AiResource } from './resources/ai';
import { makeSyncResource, type SyncResource } from './resources/sync';
import {
  makeShareLinksResource,
  type ShareLinksResource,
} from './resources/share-links';
import {
  makeNotificationsResource,
  type NotificationsResource,
} from './resources/notifications';
import {
  makeNotificationPreferencesResource,
  type NotificationPreferencesResource,
} from './resources/notification-preferences';

export interface ApiClient {
  health: HealthResource;
  me: MeResource;
  tailors: TailorsResource;
  clients: ClientsResource;
  measurementSets: MeasurementSetsResource;
  measurementTemplates: MeasurementTemplatesResource;
  groupOrders: GroupOrdersResource;
  groupOrderMembers: GroupOrderMembersResource;
  orders: OrdersResource;
  orderItems: OrderItemsResource;
  orderPhotos: OrderPhotosResource;
  designs: DesignsResource;
  ai: AiResource;
  sync: SyncResource;
  shareLinks: ShareLinksResource;
  notifications: NotificationsResource;
  notificationPreferences: NotificationPreferencesResource;
}

export type ApiClientConfig = HttpConfig;

/**
 * Creates a typed API client. Pass a JWT (string or async getter) so the
 * client can attach `Authorization: Bearer <jwt>` to every request.
 *
 * Example:
 *   const api = createApiClient({
 *     baseUrl: 'http://localhost:3001',
 *     getJwt: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
 *   });
 *   const me = await api.me.get();
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const http = new HttpClient(config);
  return {
    health: makeHealthResource(http),
    me: makeMeResource(http),
    tailors: makeTailorsResource(http),
    clients: makeClientsResource(http),
    measurementSets: makeMeasurementSetsResource(http),
    measurementTemplates: makeMeasurementTemplatesResource(http),
    groupOrders: makeGroupOrdersResource(http),
    groupOrderMembers: makeGroupOrderMembersResource(http),
    orders: makeOrdersResource(http),
    orderItems: makeOrderItemsResource(http),
    orderPhotos: makeOrderPhotosResource(http),
    designs: makeDesignsResource(http),
    ai: makeAiResource(http),
    sync: makeSyncResource(http),
    shareLinks: makeShareLinksResource(http),
    notifications: makeNotificationsResource(http),
    notificationPreferences: makeNotificationPreferencesResource(http),
  };
}
