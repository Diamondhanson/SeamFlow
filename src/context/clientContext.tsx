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
  price?: number;
  advancePayment?: number;
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
  },
  {
    id: '2',
    fullName: 'Sarah Johnson',
    phoneNumber: '+1987654321',
    address: '456 Oak Ave, Springfield',
    measurements: {},
    orders: [
      {
        id: '2',
        orderName: 'Red evening gown',
        dateOrdered: '2024-03-05',
        dateDelivery: '2024-03-25',
        notes: 'Silk material with lace details',
        status: 'in-progress'
      },
      {
        id: '3',
        orderName: 'White wedding dress',
        dateOrdered: '2024-03-10',
        dateDelivery: '2024-06-01',
        notes: 'Traditional design with long train',
        status: 'registered'
      }
    ]
  },
  {
    id: '3',
    fullName: 'Michael Chen',
    phoneNumber: '+1122334455',
    address: '789 Pine St, Riverside',
    measurements: {},
    orders: [
      {
        id: '4',
        orderName: 'Navy blue blazer',
        dateOrdered: '2024-03-15',
        dateDelivery: '2024-04-10',
        notes: 'Slim fit, modern cut',
        status: 'completed'
      },
      {
        id: '5',
        orderName: 'Gray dress pants',
        dateOrdered: '2024-03-15',
        dateDelivery: '2024-04-10',
        notes: 'Work attire, wool blend',
        status: 'completed'
      },
      {
        id: '6',
        orderName: 'Black tuxedo',
        dateOrdered: '2024-04-01',
        dateDelivery: '2024-05-15',
        notes: 'For gala event in May',
        status: 'in-progress'
      }
    ]
  },
  {
    id: '4',
    fullName: 'Emily Rodriguez',
    phoneNumber: '+1567890123',
    address: '321 Elm St, Lakeside',
    measurements: {},
    orders: [
      {
        id: '7',
        orderName: 'Summer dress collection',
        dateOrdered: '2024-04-05',
        dateDelivery: '2024-05-20',
        notes: '3 casual summer dresses, floral patterns',
        status: 'in-progress'
      },
      {
        id: '8',
        orderName: 'Professional skirt suit',
        dateOrdered: '2024-04-10',
        dateDelivery: '2024-05-01',
        notes: 'Navy blue, conference attire',
        status: 'registered'
      }
    ]
  },
  {
    id: '5',
    fullName: 'David Thompson',
    phoneNumber: '+1765432109',
    address: '555 Maple Dr, Hillcrest',
    measurements: {},
    orders: [
      {
        id: '9',
        orderName: 'Winter coat',
        dateOrdered: '2024-05-01',
        dateDelivery: '2024-09-15',
        notes: 'Heavy wool, dark green',
        status: 'registered'
      },
      {
        id: '10',
        orderName: 'Custom jeans',
        dateOrdered: '2024-05-05',
        dateDelivery: '2024-06-10',
        notes: 'Distressed denim, relaxed fit',
        status: 'registered'
      },
      {
        id: '11',
        orderName: 'Work shirts (5)',
        dateOrdered: '2024-05-10',
        dateDelivery: '2024-06-15',
        notes: 'Button-down, various colors',
        status: 'registered'
      }
    ]
  },
  {
    id: '6',
    fullName: 'Jessica Lee',
    phoneNumber: '+1234509876',
    address: '777 Cedar Ln, Westview',
    measurements: {},
    orders: [
      {
        id: '12',
        orderName: 'Maternity dress',
        dateOrdered: '2024-05-15',
        dateDelivery: '2024-06-30',
        notes: 'Comfortable fabric, baby shower event',
        status: 'registered'
      },
      {
        id: '13',
        orderName: 'Post-pregnancy outfit set',
        dateOrdered: '2024-06-01',
        dateDelivery: '2024-08-15',
        notes: 'Comfortable yet stylish everyday wear',
        status: 'registered'
      }
    ]
  },
  {
    id: '7',
    fullName: 'Robert Garcia',
    phoneNumber: '+1456789012',
    address: '888 Birch Ave, Eastside',
    measurements: {},
    orders: [
      {
        id: '14',
        orderName: 'Wedding suit',
        dateOrdered: '2024-06-05',
        dateDelivery: '2024-07-25',
        notes: 'Light gray, summer wedding',
        status: 'registered'
      },
      {
        id: '15',
        orderName: 'Dress shirts (3)',
        dateOrdered: '2024-06-10',
        dateDelivery: '2024-07-10',
        notes: 'White, light blue, and pink',
        status: 'registered'
      },
      {
        id: '16',
        orderName: 'Casual blazer',
        dateOrdered: '2024-06-15',
        dateDelivery: '2024-07-30',
        notes: 'Lightweight summer blazer',
        status: 'registered'
      }
    ]
  },
  {
    id: '8',
    fullName: 'Amanda Wilson',
    phoneNumber: '+1345678901',
    address: '999 Spruce St, Northend',
    measurements: {},
    orders: [
      {
        id: '17',
        orderName: 'Prom dress',
        dateOrdered: '2024-06-20',
        dateDelivery: '2024-08-05',
        notes: 'Daughter\'s prom, royal blue',
        status: 'registered'
      },
      {
        id: '18',
        orderName: 'Anniversary outfit',
        dateOrdered: '2024-07-01',
        dateDelivery: '2024-08-20',
        notes: 'Elegant dinner attire',
        status: 'registered'
      }
    ]
  },
  {
    id: '9',
    fullName: 'Daniel Patel',
    phoneNumber: '+1678901234',
    address: '111 Aspen Ct, Southside',
    measurements: {},
    orders: [
      {
        id: '19',
        orderName: 'Business suits (2)',
        dateOrdered: '2024-07-05',
        dateDelivery: '2024-09-01',
        notes: 'One navy, one charcoal',
        status: 'registered'
      },
      {
        id: '20',
        orderName: 'Casual wear collection',
        dateOrdered: '2024-07-10',
        dateDelivery: '2024-08-25',
        notes: 'Weekend attire, 6 pieces',
        status: 'registered'
      },
      {
        id: '21',
        orderName: 'Formal vest',
        dateOrdered: '2024-07-15',
        dateDelivery: '2024-09-10',
        notes: 'For important presentation',
        status: 'registered'
      }
    ]
  },
  {
    id: '10',
    fullName: 'Olivia Martinez',
    phoneNumber: '+1890123456',
    address: '222 Willow Way, Downtown',
    measurements: {},
    orders: [
      {
        id: '22',
        orderName: 'Birthday dress',
        dateOrdered: '2024-07-20',
        dateDelivery: '2024-09-15',
        notes: 'Special 30th birthday celebration',
        status: 'registered'
      },
      {
        id: '23',
        orderName: 'Work blazers (2)',
        dateOrdered: '2024-08-01',
        dateDelivery: '2024-09-30',
        notes: 'Professional style, breathable fabric',
        status: 'registered'
      }
    ]
  },
  {
    id: '11',
    fullName: 'James Wilson',
    phoneNumber: '+1901234567',
    address: '333 Redwood Rd, Uptown',
    measurements: {},
    orders: [
      {
        id: '24',
        orderName: 'Halloween costume',
        dateOrdered: '2024-08-05',
        dateDelivery: '2024-10-15',
        notes: 'Victorian-era gentleman outfit',
        status: 'registered'
      },
      {
        id: '25',
        orderName: 'Winter formal suit',
        dateOrdered: '2024-08-10',
        dateDelivery: '2024-11-01',
        notes: 'Black tie event in November',
        status: 'registered'
      },
      {
        id: '26',
        orderName: 'Dress pants (2)',
        dateOrdered: '2024-08-15',
        dateDelivery: '2024-10-01',
        notes: 'Work attire, standard fit',
        status: 'registered'
      }
    ]
  },
  {
    id: '12',
    fullName: 'Sophia Kim',
    phoneNumber: '+1012345678',
    address: '444 Sequoia Terrace, Midtown',
    measurements: {},
    orders: [
      {
        id: '27',
        orderName: 'Bridesmaid dresses (4)',
        dateOrdered: '2024-08-20',
        dateDelivery: '2024-10-25',
        notes: 'For sister\'s wedding, burgundy color',
        status: 'registered'
      },
      {
        id: '28',
        orderName: 'Winter coat',
        dateOrdered: '2024-09-01',
        dateDelivery: '2024-11-15',
        notes: 'Long wool coat, camel color',
        status: 'registered'
      }
    ]
  },
  {
    id: '13',
    fullName: 'William Brown',
    phoneNumber: '+1123456789',
    address: '555 Sycamore St, Westtown',
    measurements: {},
    orders: [
      {
        id: '29',
        orderName: 'Graduation outfit',
        dateOrdered: '2024-09-05',
        dateDelivery: '2024-11-20',
        notes: 'Son\'s college graduation',
        status: 'registered'
      },
      {
        id: '30',
        orderName: 'Holiday party suit',
        dateOrdered: '2024-09-10',
        dateDelivery: '2024-12-01',
        notes: 'Festive dark green velvet',
        status: 'registered'
      },
      {
        id: '31',
        orderName: 'Family photo outfits',
        dateOrdered: '2024-09-15',
        dateDelivery: '2024-11-10',
        notes: 'Coordinated family attire, 5 members',
        status: 'registered'
      },
      {
        id: '32',
        orderName: 'New Year\'s Eve tuxedo',
        dateOrdered: '2024-09-20',
        dateDelivery: '2024-12-15',
        notes: 'Special midnight blue with satin trim',
        status: 'registered'
      }
    ]
  },
  {
    id: '14',
    fullName: 'Ava Jackson',
    phoneNumber: '+1234567809',
    address: '666 Laurel Ave, Easttown',
    measurements: {},
    orders: [
      {
        id: '33',
        orderName: 'Professional wardrobe update',
        dateOrdered: '2024-09-25',
        dateDelivery: '2024-11-30',
        notes: 'Complete work attire refresh, 10 pieces',
        status: 'registered'
      },
      {
        id: '34',
        orderName: 'Christmas party dress',
        dateOrdered: '2024-10-01',
        dateDelivery: '2024-12-10',
        notes: 'Sparkly cocktail dress, red',
        status: 'registered'
      },
      {
        id: '35',
        orderName: 'Winter accessories',
        dateOrdered: '2024-10-05',
        dateDelivery: '2024-11-25',
        notes: 'Matching scarf, hat, and gloves',
        status: 'registered'
      }
    ]
  },
  {
    id: '15',
    fullName: 'Ethan Davis',
    phoneNumber: '+1345678902',
    address: '777 Magnolia Blvd, Northtown',
    measurements: {},
    orders: [
      {
        id: '36',
        orderName: 'Anniversary suit',
        dateOrdered: '2024-10-10',
        dateDelivery: '2024-12-05',
        notes: '25th wedding anniversary celebration',
        status: 'registered'
      },
      {
        id: '37',
        orderName: 'Winter dress shirts (4)',
        dateOrdered: '2024-10-15',
        dateDelivery: '2024-11-20',
        notes: 'Heavier fabric for winter months',
        status: 'registered'
      }
    ]
  },
  {
    id: '16',
    fullName: 'Isabella Thomas',
    phoneNumber: '+1456789023',
    address: '888 Juniper St, Southtown',
    measurements: {},
    orders: [
      {
        id: '38',
        orderName: 'Holiday party dresses (2)',
        dateOrdered: '2024-10-20',
        dateDelivery: '2024-12-10',
        notes: 'Office and family gatherings',
        status: 'registered'
      },
      {
        id: '39',
        orderName: 'Winter formal gown',
        dateOrdered: '2024-10-25',
        dateDelivery: '2024-12-15',
        notes: 'Annual charity gala, midnight blue',
        status: 'registered'
      },
      {
        id: '40',
        orderName: 'New Year\'s outfit',
        dateOrdered: '2024-11-01',
        dateDelivery: '2024-12-20',
        notes: 'Gold sequined cocktail dress',
        status: 'registered'
      }
    ]
  },
  {
    id: '17',
    fullName: 'Mason Clark',
    phoneNumber: '+1567890123',
    address: '999 Poplar Ln, Downtown',
    measurements: {},
    orders: [
      {
        id: '41',
        orderName: 'Business trip attire',
        dateOrdered: '2024-08-15',
        dateDelivery: '2024-09-30',
        notes: 'Complete corporate wardrobe for European trip',
        status: 'registered'
      },
      {
        id: '42',
        orderName: 'Winter casual collection',
        dateOrdered: '2024-09-15',
        dateDelivery: '2024-11-10',
        notes: 'Weekend wear, 8 pieces',
        status: 'registered'
      },
      {
        id: '43',
        orderName: 'Holiday dinner suit',
        dateOrdered: '2024-10-10',
        dateDelivery: '2024-12-05',
        notes: 'Traditional with modern cut, burgundy',
        status: 'registered'
      }
    ]
  },
  {
    id: '18',
    fullName: 'Mia Lewis',
    phoneNumber: '+1678901234',
    address: '111 Cypress Circle, Uptown',
    measurements: {},
    orders: [
      {
        id: '44',
        orderName: 'Fall wardrobe essentials',
        dateOrdered: '2024-07-15',
        dateDelivery: '2024-09-15',
        notes: 'Autumn color palette, mix and match pieces',
        status: 'registered'
      },
      {
        id: '45',
        orderName: 'Winter coat',
        dateOrdered: '2024-08-20',
        dateDelivery: '2024-10-30',
        notes: 'Knee-length wool coat, burgundy',
        status: 'registered'
      },
      {
        id: '46',
        orderName: 'Special occasion dress',
        dateOrdered: '2024-09-25',
        dateDelivery: '2024-11-15',
        notes: 'For daughter\'s wedding, mother of bride',
        status: 'registered'
      },
      {
        id: '47',
        orderName: 'Holiday host outfit',
        dateOrdered: '2024-10-30',
        dateDelivery: '2024-12-10',
        notes: 'Elegant yet comfortable for hosting',
        status: 'registered'
      }
    ]
  },
  {
    id: '19',
    fullName: 'Noah Roberts',
    phoneNumber: '+1789012345',
    address: '222 Hawthorn Rd, Midtown',
    measurements: {},
    orders: [
      {
        id: '48',
        orderName: 'Graduation ceremony suit',
        dateOrdered: '2024-08-01',
        dateDelivery: '2024-10-15',
        notes: 'PhD graduation, traditional with subtle customization',
        status: 'registered'
      },
      {
        id: '49',
        orderName: 'Job interview outfits',
        dateOrdered: '2024-09-05',
        dateDelivery: '2024-11-01',
        notes: 'Three complete professional outfits',
        status: 'registered'
      },
      {
        id: '50',
        orderName: 'Winter formal wear',
        dateOrdered: '2024-10-10',
        dateDelivery: '2024-12-01',
        notes: 'For multiple holiday events, mix and match pieces',
        status: 'registered'
      }
    ]
  },
  {
    id: '20',
    fullName: 'Charlotte Walker',
    phoneNumber: '+1890123456',
    address: '333 Chestnut Ave, Westside',
    measurements: {},
    orders: [
      {
        id: '51',
        orderName: 'Fall wedding guest dresses',
        dateOrdered: '2024-07-10',
        dateDelivery: '2024-09-01',
        notes: 'Two different styles for September weddings',
        status: 'registered'
      },
      {
        id: '52',
        orderName: 'Winter office collection',
        dateOrdered: '2024-08-15',
        dateDelivery: '2024-10-15',
        notes: 'Professional wardrobe update, 12 pieces',
        status: 'registered'
      },
      {
        id: '53',
        orderName: 'Holiday party dress',
        dateOrdered: '2024-09-20',
        dateDelivery: '2024-11-30',
        notes: 'Emerald green velvet, vintage inspired',
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
