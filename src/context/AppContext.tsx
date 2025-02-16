import { User, signOut } from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../FirebaseConfig';
import { doc, setDoc, getDoc, collection, updateDoc, FirestoreError } from 'firebase/firestore';

// Types
interface DesignItem {
  id: string;
  imageUrl: string;
  tags: string[];
  dateAdded: string;
  description?: string;
}

interface CompanyInfo {
  name: string;
  logo?: string;
  userEmail?: string;
  googleUser?: any;
}

interface AppContextType {
  companyInfo: CompanyInfo;
  designs: DesignItem[];
  inspirations: DesignItem[];
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  updateCompanyInfo: (info: CompanyInfo) => void;
  addDesign: (design: Omit<DesignItem, 'id' | 'dateAdded'>) => void;
  addInspiration: (inspiration: Omit<DesignItem, 'id' | 'dateAdded'>) => void;
  removeDesign: (id: string) => void;
  removeInspiration: (id: string) => void;
  measurementAttributes: string[];
  updateMeasurementAttributes: (attributes: string[]) => void;
  isLoading: boolean;
}

// Initial dummy data
const initialCompanyInfo: CompanyInfo = {
  name: 'LYZMA CREATIONS',
  logo: undefined,
  userEmail: undefined,
};

const initialDesigns: DesignItem[] = [
];

const initialInspirations: DesignItem[] = [
];

const DEFAULT_MEASUREMENT_ATTRIBUTES = [
  'shoulder',
  'chest',
  'waist',
  'hips',
  'topLength',
  'trouserLength',
  'legRound',
  'armRound',
  'wrist'
];

const AppContext = createContext<AppContextType | undefined>(undefined);

const logFirebaseError = (operation: string, error: any) => {
  console.log('Firebase error:', error);
  if (error instanceof FirestoreError) {
    console.error(`Firestore ${operation} error:`, {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
  } else {
    console.error(`Error during ${operation}:`, error);
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialCompanyInfo);
  const [designs, setDesigns] = useState<DesignItem[]>(initialDesigns);
  const [user, setUser] = useState<User | null>(null);
  const [inspirations, setInspirations] = useState<DesignItem[]>(initialInspirations);
  const [measurementAttributes, setMeasurementAttributes] = useState<string[]>(DEFAULT_MEASUREMENT_ATTRIBUTES);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from Firestore when user changes
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        setIsLoading(true);
        try {
          console.log('Loading user data for:', user.uid);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            console.log('User document exists, updating state');
            const userData = userDoc.data();
            setCompanyInfo(userData.companyInfo || initialCompanyInfo);
            setDesigns(userData.designs || initialDesigns);
            setInspirations(userData.inspirations || initialInspirations);
            setMeasurementAttributes(userData.measurementAttributes || DEFAULT_MEASUREMENT_ATTRIBUTES);
          } else {
            console.log('Creating new user document');
            const initialData = {
              companyInfo: initialCompanyInfo,
              designs: initialDesigns,
              inspirations: initialInspirations,
              measurementAttributes: DEFAULT_MEASUREMENT_ATTRIBUTES,
              email: user.email,
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', user.uid), initialData);
            // Set the initial data in state
            setCompanyInfo(initialData.companyInfo);
            setDesigns(initialData.designs);
            setInspirations(initialData.inspirations);
            setMeasurementAttributes(initialData.measurementAttributes);
          }
        } catch (error) {
          logFirebaseError('loadUserData', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Reset state when user is null
        setCompanyInfo(initialCompanyInfo);
        setDesigns(initialDesigns);
        setInspirations(initialInspirations);
        setMeasurementAttributes(DEFAULT_MEASUREMENT_ATTRIBUTES);
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Save all data to Firestore
  const saveToFirestore = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          companyInfo,
          designs,
          inspirations,
          measurementAttributes,
        });
      } catch (error) {
        logFirebaseError('saveToFirestore', error);
      }
    }
  };

  const updateCompanyInfo = async (info: CompanyInfo) => {
    setCompanyInfo(info);
    if (user) {
      try {
        console.log('Updating company info for user:', user.uid);
        await updateDoc(doc(db, 'users', user.uid), {
          companyInfo: info,
        });
        console.log('Company info updated successfully');
      } catch (error) {
        logFirebaseError('updateCompanyInfo', error);
      }
    }
  };

  const updateMeasurementAttributes = async (attributes: string[]) => {
    setMeasurementAttributes(attributes);
    if (user) {
      try {
        console.log('Auth state:', {
          isAuthenticated: !!user,
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
        });
        
        console.log('Updating measurement attributes for user:', user.uid);
        console.log('New attributes:', attributes);
        
        const userDocRef = doc(db, 'users', user.uid);
        console.log('Document reference:', userDocRef.path);
        
        // Check if document exists
        const docSnap = await getDoc(userDocRef);
        
        if (!docSnap.exists()) {
          console.log('Document does not exist, creating it...');
          await setDoc(userDocRef, {
            companyInfo: companyInfo,
            designs: designs,
            inspirations: inspirations,
            measurementAttributes: attributes,
            email: user.email,
            createdAt: new Date().toISOString(),
          });
        } else {
          console.log('Document exists, updating attributes...');
          await updateDoc(userDocRef, {
            measurementAttributes: attributes,
          });
        }
        
        console.log('Measurement attributes updated successfully');
      } catch (error: any) {
        console.log('Detailed error:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorName: error.name,
        });
        logFirebaseError('updateMeasurementAttributes', error);
      }
    } else {
      console.log('No user found in context');
    }
  };

  const addDesign = async (design: Omit<DesignItem, 'id' | 'dateAdded'>) => {
    const newDesign: DesignItem = {
      ...design,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    const updatedDesigns = [newDesign, ...designs];
    setDesigns(updatedDesigns);
    if (user) {
      try {
        console.log('Adding new design for user:', user.uid);
        await updateDoc(doc(db, 'users', user.uid), {
          designs: updatedDesigns,
        });
        console.log('Design added successfully');
      } catch (error) {
        logFirebaseError('addDesign', error);
      }
    }
  };

  const addInspiration = async (inspiration: Omit<DesignItem, 'id' | 'dateAdded'>) => {
    const newInspiration: DesignItem = {
      ...inspiration,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    const updatedInspirations = [newInspiration, ...inspirations];
    setInspirations(updatedInspirations);
    if (user) {
      try {
        console.log('Adding new inspiration for user:', user.uid);
        await updateDoc(doc(db, 'users', user.uid), {
          inspirations: updatedInspirations,
        });
        console.log('Inspiration added successfully');
      } catch (error) {
        logFirebaseError('addInspiration', error);
      }
    }
  };

  const removeDesign = async (id: string) => {
    const updatedDesigns = designs.filter(design => design.id !== id);
    setDesigns(updatedDesigns);
    if (user) {
      try {
        console.log('Removing design for user:', user.uid);
        await updateDoc(doc(db, 'users', user.uid), {
          designs: updatedDesigns,
        });
        console.log('Design removed successfully');
      } catch (error) {
        logFirebaseError('removeDesign', error);
      }
    }
  };

  const removeInspiration = async (id: string) => {
    const updatedInspirations = inspirations.filter(inspiration => inspiration.id !== id);
    setInspirations(updatedInspirations);
    if (user) {
      try {
        console.log('Removing inspiration for user:', user.uid);
        await updateDoc(doc(db, 'users', user.uid), {
          inspirations: updatedInspirations,
        });
        console.log('Inspiration removed successfully');
      } catch (error) {
        logFirebaseError('removeInspiration', error);
      }
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user');
      // Save current state before clearing
      await saveToFirestore();
      
      // Then sign out and clear storage
      await Promise.all([
        signOut(auth),
        AsyncStorage.removeItem('user')
      ]);
      
      // Finally clear state
      setUser(null);
      setCompanyInfo(initialCompanyInfo);
      setDesigns(initialDesigns);
      setInspirations(initialInspirations);
      setMeasurementAttributes(DEFAULT_MEASUREMENT_ATTRIBUTES);
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      logFirebaseError('logout', error);
    }
  };

  return (
    <AppContext.Provider 
      value={{ 
        companyInfo, 
        designs, 
        inspirations,
        user,
        setUser,
        logout,
        updateCompanyInfo,
        addDesign,
        addInspiration,
        removeDesign,
        removeInspiration,
        measurementAttributes,
        updateMeasurementAttributes,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
