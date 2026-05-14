import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  shoulder: number;
  hips: number;
  chest: number;
  waist: number;
  topLength: number;
  trouserLength: number;
  legRound: number;
  armRound: number;
  wrist: number;
}

export interface Client {
  id: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  measurements: Measurements;
  orders: OrderDetails[];
}

interface ClientContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  addOrderToClient: (clientId: string, order: Omit<OrderDetails, 'id' | 'status'>) => void;
  updateOrderStatus: (clientId: string, orderId: string, status: OrderStatus) => void;
  updateClientMeasurements: (clientId: string, measurements: Measurements) => void;
}

// Initial dummy data
const initialClients: Client[] = [
  {
    id: '1',
    fullName: 'John Smith',
    phoneNumber: '+1234567890',
    address: '123 Main St, City',
    measurements: {
      shoulder: 42,
      hips: 38,
      length: 70,
      chest: 40,
    },
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

  const addClient = (newClient: Omit<Client, 'id'>) => {
    const client: Client = {
      ...newClient,
      id: Date.now().toString(),
    };
    setClients(prev => [...prev, client]);
  };

  const addOrderToClient = (clientId: string, order: Omit<OrderDetails, 'id' | 'status'>) => {
    setClients(prev => prev.map(client => {
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
    }));
  };

  const updateOrderStatus = (clientId: string, orderId: string, status: OrderStatus) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          orders: client.orders.map(order => 
            order.id === orderId ? { ...order, status } : order
          )
        };
      }
      return client;
    }));
  };

  const updateClientMeasurements = (clientId: string, measurements: Measurements) => {
    setClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          measurements
        };
      }
      return client;
    }));
  };

  return (
    <ClientContext.Provider 
      value={{ 
        clients, 
        addClient, 
        addOrderToClient,
        updateOrderStatus,
        updateClientMeasurements
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
