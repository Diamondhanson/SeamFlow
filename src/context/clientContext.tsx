import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../supabaseConfig';
import { useApp } from './AppContext';

// Types
export type OrderStatus = 'registered' | 'in_progress' | 'testing' | 'on_pause' | 'delivered';

export interface OrderDetails {
  id: string;
  orderName: string;
  dateOrdered: string;
  dateDelivery: string;
  notes: string;
  status: OrderStatus;
  price?: number;
  advancePayment?: number;
  image1Url?: string;
  image2Url?: string;
}

export interface Measurements {
  [key: string]: number;
}

export interface Client {
  id: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  measurements: Measurements;
  orders: OrderDetails[];
}

// Add new types for bulk orders
export interface BulkOrderMember {
  id: string;
  name: string;
  measurements: Measurements;
  notes?: string;
}

export interface BulkOrder {
  id: string;
  orderName: string;
  dateOrdered: string;
  dateDelivery: string;
  phoneNumber: string;
  address: string;
  members: BulkOrderMember[];
  notes: string;
  status: OrderStatus;
  price?: number;
  advancePayment?: number;
  image1Url?: string;
  image2Url?: string;
}

interface ClientContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  addOrderToClient: (clientId: string, order: Omit<OrderDetails, 'id' | 'status'>) => void;
  updateOrderStatus: (clientId: string, orderId: string, status: OrderStatus) => void;
  updateOrderImages: (clientId: string, orderId: string, image1Url?: string, image2Url?: string) => void;
  updateClientMeasurements: (clientId: string, measurements: Measurements) => void;
  bulkOrders: BulkOrder[];
  addBulkOrder: (order: Omit<BulkOrder, 'id' | 'status'>) => void;
  updateBulkOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateBulkOrderImages: (orderId: string, image1Url?: string, image2Url?: string) => void;
  updateBulkOrderMember: (orderId: string, memberId: string, updates: Partial<BulkOrderMember>) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const { user } = useApp();

  // Load clients data from Supabase when user changes
  useEffect(() => {
    if (user) {
      loadClientsData();
    } else {
      setClients([]);
      setBulkOrders([]);
    }
  }, [user]);

  const loadClientsData = async () => {
    if (!user) return;

    try {
      // Load clients with their orders
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          orders (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      if (clientsData) {
        const formattedClients: Client[] = clientsData.map((client: any) => ({
          id: client.id,
          fullName: client.full_name,
          phoneNumber: client.phone_number,
          address: client.address,
          measurements: client.measurements || {},
          orders: (client.orders || []).map((order: any) => ({
            id: order.id,
            orderName: order.order_name,
            dateOrdered: order.date_ordered,
            dateDelivery: order.date_delivery,
            notes: order.notes || '',
            status: order.status,
            price: order.price || 0,
            advancePayment: order.advance_payment || 0,
            image1Url: order.image_1_url,
            image2Url: order.image_2_url,
          })),
        }));
        setClients(formattedClients);
      }

      // Load bulk orders with their members
      const { data: bulkOrdersData, error: bulkOrdersError } = await supabase
        .from('bulk_orders')
        .select(`
          *,
          bulk_order_members (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bulkOrdersError) throw bulkOrdersError;

      if (bulkOrdersData) {
        const formattedBulkOrders: BulkOrder[] = bulkOrdersData.map((bulkOrder: any) => ({
          id: bulkOrder.id,
          orderName: bulkOrder.order_name,
          dateOrdered: bulkOrder.date_ordered,
          dateDelivery: bulkOrder.date_delivery,
          phoneNumber: bulkOrder.phone_number,
          address: bulkOrder.address,
          notes: bulkOrder.notes || '',
          status: bulkOrder.status,
          price: bulkOrder.price || 0,
          advancePayment: bulkOrder.advance_payment || 0,
          image1Url: bulkOrder.image_1_url,
          image2Url: bulkOrder.image_2_url,
          members: (bulkOrder.bulk_order_members || []).map((member: any) => ({
            id: member.id,
            name: member.name,
            measurements: member.measurements || {},
            notes: member.notes || '',
          })),
        }));
        setBulkOrders(formattedBulkOrders);
      }
    } catch (error) {
      console.error('Error loading clients data:', error);
    }
  };

  const addClient = async (newClient: Omit<Client, 'id'>) => {
    if (!user) return;

    try {
      // Insert client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          full_name: newClient.fullName,
          phone_number: newClient.phoneNumber,
          address: newClient.address,
          measurements: newClient.measurements,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Insert orders if any
      if (newClient.orders && newClient.orders.length > 0) {
        const ordersToInsert = newClient.orders.map(order => ({
          client_id: clientData.id,
          user_id: user.id,
          order_name: order.orderName,
          date_ordered: order.dateOrdered,
          date_delivery: order.dateDelivery,
          notes: order.notes,
          status: order.status,
          price: order.price || 0,
          advance_payment: order.advancePayment || 0,
          image_1_url: order.image1Url,
          image_2_url: order.image2Url,
        }));

        const { error: ordersError } = await supabase
          .from('orders')
          .insert(ordersToInsert);

        if (ordersError) throw ordersError;
      }

      // Reload clients data
      await loadClientsData();
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  };

  const addOrderToClient = async (clientId: string, order: Omit<OrderDetails, 'id' | 'status'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('orders')
        .insert({
          client_id: clientId,
          user_id: user.id,
          order_name: order.orderName,
          date_ordered: order.dateOrdered,
          date_delivery: order.dateDelivery,
          notes: order.notes,
          status: 'registered',
          price: order.price || 0,
          advance_payment: order.advancePayment || 0,
          image_1_url: order.image1Url,
          image_2_url: order.image2Url,
        });

      if (error) throw error;

      // Reload clients data
      await loadClientsData();
    } catch (error) {
      console.error('Error adding order to client:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (clientId: string, orderId: string, status: OrderStatus) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setClients(prev => prev.map(client =>
        client.id === clientId
          ? {
              ...client,
              orders: client.orders.map(order =>
                order.id === orderId ? { ...order, status } : order
              ),
            }
          : client
      ));
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const updateOrderImages = async (clientId: string, orderId: string, image1Url?: string, image2Url?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          image_1_url: image1Url,
          image_2_url: image2Url
        })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setClients(prev => prev.map(client =>
        client.id === clientId
          ? {
              ...client,
              orders: client.orders.map(order =>
                order.id === orderId ? { ...order, image1Url, image2Url } : order
              ),
            }
          : client
      ));
    } catch (error) {
      console.error('Error updating order images:', error);
      throw error;
    }
  };

  const updateClientMeasurements = async (clientId: string, measurements: Measurements) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ measurements })
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setClients(prev => prev.map(client =>
        client.id === clientId ? { ...client, measurements } : client
      ));
    } catch (error) {
      console.error('Error updating client measurements:', error);
      throw error;
    }
  };

  const addBulkOrder = async (newOrder: Omit<BulkOrder, 'id' | 'status'>) => {
    if (!user) return;

    try {
      // Insert bulk order
      const { data: bulkOrderData, error: bulkOrderError } = await supabase
        .from('bulk_orders')
        .insert({
          user_id: user.id,
          order_name: newOrder.orderName,
          date_ordered: newOrder.dateOrdered,
          date_delivery: newOrder.dateDelivery,
          phone_number: newOrder.phoneNumber,
          address: newOrder.address,
          notes: newOrder.notes,
          status: 'registered',
          price: newOrder.price || 0,
          advance_payment: newOrder.advancePayment || 0,
          image_1_url: newOrder.image1Url,
          image_2_url: newOrder.image2Url,
        })
        .select()
        .single();

      if (bulkOrderError) throw bulkOrderError;

      // Insert bulk order members
      if (newOrder.members && newOrder.members.length > 0) {
        const membersToInsert = newOrder.members.map(member => ({
          bulk_order_id: bulkOrderData.id,
          name: member.name,
          measurements: member.measurements,
          notes: member.notes || '',
        }));

        const { error: membersError } = await supabase
          .from('bulk_order_members')
          .insert(membersToInsert);

        if (membersError) throw membersError;
      }

      // Reload bulk orders data
      await loadClientsData();
    } catch (error) {
      console.error('Error adding bulk order:', error);
      throw error;
    }
  };

  const updateBulkOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bulk_orders')
        .update({ status })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setBulkOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status } : order
      ));
    } catch (error) {
      console.error('Error updating bulk order status:', error);
      throw error;
    }
  };

  const updateBulkOrderImages = async (orderId: string, image1Url?: string, image2Url?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bulk_orders')
        .update({ 
          image_1_url: image1Url,
          image_2_url: image2Url
        })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setBulkOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, image1Url, image2Url } : order
      ));
    } catch (error) {
      console.error('Error updating bulk order images:', error);
      throw error;
    }
  };

  const updateBulkOrderMember = async (
    orderId: string,
    memberId: string,
    updates: Partial<BulkOrderMember>
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bulk_order_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;

      // Update local state
      setBulkOrders(prev => prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              members: order.members.map(member =>
                member.id === memberId ? { ...member, ...updates } : member
              ),
            }
          : order
      ));
    } catch (error) {
      console.error('Error updating bulk order member:', error);
      throw error;
    }
  };

  return (
    <ClientContext.Provider
      value={{
        clients,
        addClient,
        addOrderToClient,
        updateOrderStatus,
        updateOrderImages,
        updateClientMeasurements,
        bulkOrders,
        addBulkOrder,
        updateBulkOrderStatus,
        updateBulkOrderImages,
        updateBulkOrderMember,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
};
