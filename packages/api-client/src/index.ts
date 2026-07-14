export { createApiClient } from './client';
export type { ApiClient, ApiClientConfig } from './client';
export { ApiError } from './error';
export type { JwtProvider, HttpConfig } from './http';

// Re-export response shapes that callers commonly need.
export type { HealthResponse } from './resources/health';
export type { MeResponse } from './resources/me';
export type { ListClientsQuery, ListClientsResponse } from './resources/clients';
export type { ListMeasurementSetsResponse } from './resources/measurement-sets';
export type { ListMeasurementTemplatesResponse } from './resources/measurement-templates';
export type {
  ListGroupOrdersQuery,
  ListGroupOrdersResponse,
} from './resources/group-orders';
export type {
  ListGroupOrderMembersResponse,
  PromoteMemberToClientResponse,
} from './resources/group-order-members';
export type { ListOrdersQuery, ListOrdersResponse } from './resources/orders';
export type { ListOrderItemsResponse } from './resources/order-items';
export type { ListOrderPhotosResponse } from './resources/order-photos';
export type { ListGroupOrderPhotosResponse } from './resources/group-order-photos';
export type { ListDesignsResponse } from './resources/designs';
