import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
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
}

interface ClientContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  addOrderToClient: (clientId: string, order: Omit<OrderDetails, 'id' | 'status'>) => void;
  updateOrderStatus: (clientId: string, orderId: string, status: OrderStatus) => void;
  updateClientMeasurements: (clientId: string, measurements: Measurements) => void;
  bulkOrders: BulkOrder[];
  addBulkOrder: (order: Omit<BulkOrder, 'id' | 'status'>) => void;
  updateBulkOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateBulkOrderMember: (orderId: string, memberId: string, updates: Partial<BulkOrderMember>) => void;
}

// Initial dummy data
const initialClients: Client[] = [
  {
    id: '1',
    fullName: 'John Smith',
    phoneNumber: '+1234567890',
    address: '123 Main St, City',
    measurements: {},  // Empty object as measurements will be dynamic
    orders: [
      {
        id: '1',
        orderName: 'Blue formal suit',
        dateOrdered: '2024-03-01',
        dateDelivery: '2024-03-15',
        notes: 'Blue formal suit with pinstripes',
        status: 'registered'
      }
    ]
  }
];

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const { user } = useApp();

  // Load clients data when user changes
  useEffect(() => {
    const loadClientsData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.clients) {
              setClients(userData.clients);
            }
            if (userData.bulkOrders) {
              setBulkOrders(userData.bulkOrders);
            }
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadClientsData();
  }, [user]);

  // Save clients data to Firestore
  const saveClientsToFirestore = async (updatedClients: Client[]) => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          clients: updatedClients,
        });
      } catch (error) {
        console.error('Error saving clients:', error);
      }
    }
  };

  const addClient = async (newClient: Omit<Client, 'id'>) => {
    const client: Client = {
      ...newClient,
      id: Date.now().toString(),
    };
    const updatedClients = [...clients, client];
    setClients(updatedClients);
    await saveClientsToFirestore(updatedClients);
  };

  const addOrderToClient = async (clientId: string, order: Omit<OrderDetails, 'id' | 'status'>) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          orders: [...client.orders, {
            ...order,
            id: Date.now().toString(),
            status: 'registered'
          }]
        };
      }
      return client;
    });
    setClients(updatedClients);
    await saveClientsToFirestore(updatedClients);
  };

  const updateOrderStatus = async (clientId: string, orderId: string, status: OrderStatus) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          orders: client.orders.map(order => 
            order.id === orderId ? { ...order, status } : order
          )
        };
      }
      return client;
    });
    setClients(updatedClients);
    await saveClientsToFirestore(updatedClients);
  };

  const updateClientMeasurements = async (clientId: string, measurements: Measurements) => {
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          measurements
        };
      }
      return client;
    });
    setClients(updatedClients);
    await saveClientsToFirestore(updatedClients);
  };

  // Add new bulk order functions
  const addBulkOrder = async (newOrder: Omit<BulkOrder, 'id' | 'status'>) => {
    const order: BulkOrder = {
      ...newOrder,
      id: Date.now().toString(),
      status: 'registered'
    };
    const updatedOrders = [...bulkOrders, order];
    setBulkOrders(updatedOrders);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          bulkOrders: updatedOrders,
        });
      } catch (error) {
        console.error('Error saving bulk order:', error);
      }
    }
  };

  const updateBulkOrderStatus = async (orderId: string, status: OrderStatus) => {
    const updatedOrders = bulkOrders.map(order =>
      order.id === orderId ? { ...order, status } : order
    );
    setBulkOrders(updatedOrders);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          bulkOrders: updatedOrders,
        });
      } catch (error) {
        console.error('Error updating bulk order status:', error);
      }
    }
  };

  const updateBulkOrderMember = async (
    orderId: string,
    memberId: string,
    updates: Partial<BulkOrderMember>
  ) => {
    const updatedOrders = bulkOrders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          members: order.members.map(member =>
            member.id === memberId ? { ...member, ...updates } : member
          ),
        };
      }
      return order;
    });
    setBulkOrders(updatedOrders);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          bulkOrders: updatedOrders,
        });
      } catch (error) {
        console.error('Error updating bulk order member:', error);
      }
    }
  };

  return (
    <ClientContext.Provider 
      value={{ 
        clients, 
        addClient, 
        addOrderToClient,
        updateOrderStatus,
        updateClientMeasurements,
        bulkOrders,
        addBulkOrder,
        updateBulkOrderStatus,
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
