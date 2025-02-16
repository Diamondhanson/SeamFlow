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
          }
        } catch (error) {
          console.error('Error loading clients:', error);
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
