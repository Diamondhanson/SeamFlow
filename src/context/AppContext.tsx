import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../supabaseConfig';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

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
}

interface AppContextType {
  companyInfo: CompanyInfo;
  designs: DesignItem[];
  inspirations: DesignItem[];
  user: User | null;
  session: Session | null;
  logout: () => Promise<void>;
  updateCompanyInfo: (info: CompanyInfo) => Promise<void>;
  addDesign: (design: Omit<DesignItem, 'id' | 'dateAdded'>) => Promise<void>;
  addInspiration: (inspiration: Omit<DesignItem, 'id' | 'dateAdded'>) => Promise<void>;
  removeDesign: (id: string) => Promise<void>;
  removeInspiration: (id: string) => Promise<void>;
  measurementAttributes: string[];
  updateMeasurementAttributes: (attributes: string[]) => Promise<void>;
  isLoading: boolean;
}

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

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: 'LYZMA CREATIONS' });
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [inspirations, setInspirations] = useState<DesignItem[]>([]);
  const [measurementAttributes, setMeasurementAttributes] = useState<string[]>(DEFAULT_MEASUREMENT_ATTRIBUTES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle OAuth redirect success
      if (_event === 'SIGNED_IN' && session) {
        console.log('User signed in successfully');
      }
      
      if (_event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      // Reset state when user is null
      setCompanyInfo({ name: 'LYZMA CREATIONS' });
      setDesigns([]);
      setInspirations([]);
      setMeasurementAttributes(DEFAULT_MEASUREMENT_ATTRIBUTES);
      setIsLoading(false);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load user profile
      const { data: profile } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCompanyInfo({
          name: profile.company_name || 'LYZMA CREATIONS',
          logo: profile.company_logo,
        });
        setMeasurementAttributes(profile.measurement_attributes || DEFAULT_MEASUREMENT_ATTRIBUTES);
      }

      // Load designs
      const { data: designsData } = await supabase
        .from('designs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (designsData) {
        setDesigns(designsData.map((d: any) => ({
          id: d.id,
          imageUrl: d.image_url,
          tags: d.tags || [],
          dateAdded: d.date_added,
          description: d.description,
        })));
      }

      // Load inspirations
      const { data: inspirationsData } = await supabase
        .from('inspirations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (inspirationsData) {
        setInspirations(inspirationsData.map((i: any) => ({
          id: i.id,
          imageUrl: i.image_url,
          tags: i.tags || [],
          dateAdded: i.date_added,
          description: i.description,
        })));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanyInfo = async (info: CompanyInfo) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users_profile')
        .update({
          company_name: info.name,
          company_logo: info.logo,
        })
        .eq('id', user.id);

      if (error) throw error;
      setCompanyInfo(info);
    } catch (error) {
      console.error('Error updating company info:', error);
      throw error;
    }
  };

  const updateMeasurementAttributes = async (attributes: string[]) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users_profile')
        .update({ measurement_attributes: attributes })
        .eq('id', user.id);

      if (error) throw error;
      setMeasurementAttributes(attributes);
    } catch (error) {
      console.error('Error updating measurement attributes:', error);
      throw error;
    }
  };

  // Helper function to upload image to Supabase Storage (React Native compatible)
  const uploadImage = async (imageUri: string, folder: 'designs' | 'inspirations'): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // For React Native, we need to handle file uploads differently
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
      
      // Read the file as base64 for React Native
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('seamflow-images')
        .upload(fileName, uint8Array, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        // If upload fails, return local URI as fallback
        return imageUri;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('seamflow-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded successfully:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      // Return local URI as fallback to prevent crashes
      return imageUri;
    }
  };

  const addDesign = async (design: Omit<DesignItem, 'id' | 'dateAdded'>) => {
    if (!user) return;
    
    try {
      // Upload image to storage first and get public URL
      const publicImageUrl = await uploadImage(design.imageUrl, 'designs');
      
      const { data, error } = await supabase
        .from('designs')
        .insert({
          user_id: user.id,
          image_url: publicImageUrl, // Use the public URL from storage
          tags: design.tags,
          description: design.description,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newDesign: DesignItem = {
        id: data.id,
        imageUrl: data.image_url,
        tags: data.tags || [],
        dateAdded: data.date_added,
        description: data.description,
      };
      
      setDesigns(prev => [newDesign, ...prev]);
    } catch (error) {
      console.error('Error adding design:', error);
      throw error;
    }
  };

  const addInspiration = async (inspiration: Omit<DesignItem, 'id' | 'dateAdded'>) => {
    if (!user) return;
    
    try {
      // Upload image to storage first and get public URL
      const publicImageUrl = await uploadImage(inspiration.imageUrl, 'inspirations');
      
      const { data, error } = await supabase
        .from('inspirations')
        .insert({
          user_id: user.id,
          image_url: publicImageUrl, // Use the public URL from storage
          tags: inspiration.tags,
          description: inspiration.description,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newInspiration: DesignItem = {
        id: data.id,
        imageUrl: data.image_url,
        tags: data.tags || [],
        dateAdded: data.date_added,
        description: data.description,
      };
      
      setInspirations(prev => [newInspiration, ...prev]);
    } catch (error) {
      console.error('Error adding inspiration:', error);
      throw error;
    }
  };

  const removeDesign = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('designs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setDesigns(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error removing design:', error);
      throw error;
    }
  };

  const removeInspiration = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('inspirations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setInspirations(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error removing inspiration:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        companyInfo,
        designs,
        inspirations,
        user,
        session,
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