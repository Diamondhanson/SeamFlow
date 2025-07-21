import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../supabaseConfig';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { hashPin, validatePin as validatePinUtil } from '../utils/pinUtils';
import {
  hashSecurityAnswer,
  validateSecurityAnswer,
  logRecoveryAttempt,
  trackPinAttempt,
  checkPinLockout
} from '../utils/recoveryUtils';
import { notificationService, NotificationData } from '../utils/notificationService';
import { deliveryNotificationService } from '../utils/deliveryNotificationService';
import { translate } from '../i18n';

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

interface SecurityQuestions {
  question1: string;
  answer1: string;
  question2: string;
  answer2: string;
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
  addMultipleDesigns: (designs: Omit<DesignItem, 'id' | 'dateAdded'>[], onProgress?: (current: number, total: number) => void) => Promise<void>;
  addInspiration: (inspiration: Omit<DesignItem, 'id' | 'dateAdded'>) => Promise<void>;
  addMultipleInspirations: (inspirations: Omit<DesignItem, 'id' | 'dateAdded'>[], onProgress?: (current: number, total: number) => void) => Promise<void>;
  removeDesign: (id: string) => Promise<void>;
  removeInspiration: (id: string) => Promise<void>;
  measurementAttributes: string[];
  updateMeasurementAttributes: (attributes: string[]) => Promise<void>;
  isLoading: boolean;
  // PIN functionality
  hasPinSet: boolean;
  setupPin: (pin: string) => Promise<void>;
  validatePin: (pin: string) => Promise<boolean>;
  removePin: () => Promise<void>;
  // Recovery functionality
  hasSecurityQuestions: boolean;
  setupSecurityQuestions: (questions: SecurityQuestions) => Promise<void>;
  validateSecurityQuestions: (question1Answer: string, question2Answer: string) => Promise<boolean>;
  getSecurityQuestions: () => Promise<{ question1: string; question2: string } | null>;
  resetPinWithPassword: (email: string, password: string) => Promise<void>;
  resetPinWithSecurityQuestions: (question1Answer: string, question2Answer: string) => Promise<void>;
  checkPinLockoutStatus: () => Promise<{ locked: boolean; attemptsRemaining: number; lockedUntil?: Date }>;
  validatePinWithTracking: (pin: string) => Promise<{ success: boolean; locked: boolean; attemptsRemaining: number }>;
  // Notification functionality
  notificationPermissionStatus: string;
  pushToken: string | null;
  registerForNotifications: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
  sendPushNotification: (userIds: string[], notificationData: NotificationData) => Promise<void>;
  scheduleLocalNotification: (notificationData: NotificationData, trigger: Date | number) => Promise<string>;
  getNotificationPermissionStatus: () => Promise<string>;
  checkPushTokensInDatabase: () => Promise<any[] | undefined>;
  // Delivery notification functionality
  checkDeliveryReminders: () => Promise<void>;
  getDeliveryNotificationHistory: () => Promise<any[]>;
  manualDeliveryCheck: () => Promise<{ reminders: any[]; notificationsSent: number }>;
}

// Default measurement attributes - these will be translated
const getDefaultMeasurementAttributes = (): string[] => [
  translate('defaultMeasurements.shoulder'),
  translate('defaultMeasurements.chest'),
  translate('defaultMeasurements.waist'),
  translate('defaultMeasurements.hips'),
  translate('defaultMeasurements.topLength'),
  translate('defaultMeasurements.trouserLength'),
  translate('defaultMeasurements.legRound'),
  translate('defaultMeasurements.armRound'),
  translate('defaultMeasurements.wrist')
];

// Keep original keys for backward compatibility and user preference storage
const DEFAULT_MEASUREMENT_KEYS = [
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
  const [measurementAttributes, setMeasurementAttributes] = useState<string[]>(getDefaultMeasurementAttributes());
  const [isLoading, setIsLoading] = useState(true);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [hasSecurityQuestions, setHasSecurityQuestions] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<string>('unknown');
  const [pushToken, setPushToken] = useState<string | null>(null);

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
      // Register for notifications when user is available
      registerForNotifications();
    } else {
      // Reset state when user is null
      setCompanyInfo({ name: 'LYZMA CREATIONS' });
      setDesigns([]);
      setInspirations([]);
      setMeasurementAttributes(getDefaultMeasurementAttributes());
      setIsLoading(false);
      setPushToken(null);
      setNotificationPermissionStatus('unknown');
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
        setMeasurementAttributes(profile.measurement_attributes || getDefaultMeasurementAttributes());
        setHasPinSet(!!profile.pin_hash); // Check if PIN is set
        setHasSecurityQuestions(!!(profile.security_question_1 && profile.security_answer_1_hash && 
                                   profile.security_question_2 && profile.security_answer_2_hash)); // Check if security questions are set
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

  const addMultipleDesigns = async (designs: Omit<DesignItem, 'id' | 'dateAdded'>[], onProgress?: (current: number, total: number) => void) => {
    if (!user || designs.length === 0) return;
    
    try {
      const newDesigns: DesignItem[] = [];
      
      // Process uploads in parallel with limited concurrency (3 at a time)
      const BATCH_SIZE = 3;
      for (let i = 0; i < designs.length; i += BATCH_SIZE) {
        const batch = designs.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (design, batchIndex) => {
          const actualIndex = i + batchIndex;
          
          // Upload image to storage first
          const publicImageUrl = await uploadImage(design.imageUrl, 'designs');
          
          // Insert into database
          const { data, error } = await supabase
            .from('designs')
            .insert({
              user_id: user.id,
              image_url: publicImageUrl,
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
          
          // Update progress
          onProgress?.(actualIndex + 1, designs.length);
          
          return newDesign;
        });
        
        // Wait for current batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Add successful uploads to results
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            newDesigns.push(result.value);
          }
        });
      }
      
      // Update state with all new designs at once
      setDesigns(prev => [...newDesigns, ...prev]);
      
    } catch (error) {
      console.error('Error adding multiple designs:', error);
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

  const addMultipleInspirations = async (inspirations: Omit<DesignItem, 'id' | 'dateAdded'>[], onProgress?: (current: number, total: number) => void) => {
    if (!user || inspirations.length === 0) return;
    
    try {
      const newInspirations: DesignItem[] = [];
      
      // Process uploads in parallel with limited concurrency (3 at a time)
      const BATCH_SIZE = 3;
      for (let i = 0; i < inspirations.length; i += BATCH_SIZE) {
        const batch = inspirations.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (inspiration, batchIndex) => {
          const actualIndex = i + batchIndex;
          
          // Upload image to storage first
          const publicImageUrl = await uploadImage(inspiration.imageUrl, 'inspirations');
          
          // Insert into database
          const { data, error } = await supabase
            .from('inspirations')
            .insert({
              user_id: user.id,
              image_url: publicImageUrl,
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
          
          // Update progress
          onProgress?.(actualIndex + 1, inspirations.length);
          
          return newInspiration;
        });
        
        // Wait for current batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Add successful uploads to results
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            newInspirations.push(result.value);
          }
        });
      }
      
      // Update state with all new inspirations at once
      setInspirations(prev => [...newInspirations, ...prev]);
      
    } catch (error) {
      console.error('Error adding multiple inspirations:', error);
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

  const setupPin = async (pin: string) => {
    if (!user) return;
    
    try {
      const hashedPin = await hashPin(pin);
      const { error } = await supabase
        .from('users_profile')
        .update({ pin_hash: hashedPin })
        .eq('id', user.id);

      if (error) throw error;
      setHasPinSet(true);
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw error;
    }
  };

  const validatePin = async (pin: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('pin_hash')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.pin_hash) return false;
      return await validatePinUtil(pin, profile.pin_hash);
    } catch (error) {
      console.error('Error validating PIN:', error);
      return false;
    }
  };

  const removePin = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users_profile')
        .update({ pin_hash: null })
        .eq('id', user.id);

      if (error) throw error;
      setHasPinSet(false);
    } catch (error) {
      console.error('Error removing PIN:', error);
      throw error;
    }
  };

  // Recovery functionality
  const setupSecurityQuestions = async (questions: SecurityQuestions) => {
    if (!user) return;
    
    try {
      const answer1Hash = await hashSecurityAnswer(questions.answer1);
      const answer2Hash = await hashSecurityAnswer(questions.answer2);
      
      const { error } = await supabase
        .from('users_profile')
        .update({
          security_question_1: questions.question1,
          security_answer_1_hash: answer1Hash,
          security_question_2: questions.question2,
          security_answer_2_hash: answer2Hash,
        })
        .eq('id', user.id);

      if (error) throw error;
      setHasSecurityQuestions(true);
    } catch (error) {
      console.error('Error setting up security questions:', error);
      throw error;
    }
  };

  const validateSecurityQuestions = async (question1Answer: string, question2Answer: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('security_answer_1_hash, security_answer_2_hash')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.security_answer_1_hash || !profile.security_answer_2_hash) {
        return false;
      }

      const answer1Valid = await validateSecurityAnswer(question1Answer, profile.security_answer_1_hash);
      const answer2Valid = await validateSecurityAnswer(question2Answer, profile.security_answer_2_hash);
      
      const success = answer1Valid && answer2Valid;
      
      // Log the attempt
      await logRecoveryAttempt(
        user.id,
        'pin_reset',
        'security_questions',
        success,
        success ? undefined : 'Invalid security answers'
      );
      
      return success;
    } catch (error) {
      console.error('Error validating security questions:', error);
      await logRecoveryAttempt(
        user.id,
        'pin_reset',
        'security_questions',
        false,
        'Validation error'
      );
      return false;
    }
  };

  const getSecurityQuestions = async (): Promise<{ question1: string; question2: string } | null> => {
    if (!user) return null;
    
    try {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('security_question_1, security_question_2')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.security_question_1 || !profile.security_question_2) {
        return null;
      }

      return {
        question1: profile.security_question_1,
        question2: profile.security_question_2,
      };
    } catch (error) {
      console.error('Error getting security questions:', error);
      return null;
    }
  };

  const resetPinWithPassword = async (email: string, password: string) => {
    if (!user) return;
    
    try {
      // Verify the user's credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        await logRecoveryAttempt(
          user.id,
          'pin_reset',
          'email_password',
          false,
          'Invalid credentials'
        );
        throw new Error('Invalid email or password');
      }

      // Get current reset count
      const { data: currentProfile } = await supabase
        .from('users_profile')
        .select('pin_reset_count')
        .eq('id', user.id)
        .single();

      // Remove the PIN
      const { error } = await supabase
        .from('users_profile')
        .update({ 
          pin_hash: null,
          pin_reset_count: (currentProfile?.pin_reset_count || 0) + 1,
          last_pin_reset: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setHasPinSet(false);
      
      // Log successful recovery
      await logRecoveryAttempt(
        user.id,
        'pin_reset',
        'email_password',
        true
      );
    } catch (error) {
      console.error('Error resetting PIN with password:', error);
      await logRecoveryAttempt(
        user.id,
        'pin_reset',
        'email_password',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  };

  const resetPinWithSecurityQuestions = async (question1Answer: string, question2Answer: string) => {
    if (!user) return;
    
    try {
      const isValid = await validateSecurityQuestions(question1Answer, question2Answer);
      
      if (!isValid) {
        throw new Error('Invalid security answers');
      }

      // Get current reset count
      const { data: currentProfile } = await supabase
        .from('users_profile')
        .select('pin_reset_count')
        .eq('id', user.id)
        .single();

      // Remove the PIN
      const { error } = await supabase
        .from('users_profile')
        .update({ 
          pin_hash: null,
          pin_reset_count: (currentProfile?.pin_reset_count || 0) + 1,
          last_pin_reset: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setHasPinSet(false);
      
      // Success was already logged in validateSecurityQuestions
    } catch (error) {
      console.error('Error resetting PIN with security questions:', error);
      throw error;
    }
  };

  const checkPinLockoutStatus = async () => {
    if (!user) return { locked: false, attemptsRemaining: 5 };
    
    return await checkPinLockout(user.id);
  };

  const validatePinWithTracking = async (pin: string) => {
    if (!user) return { success: false, locked: false, attemptsRemaining: 5 };
    
    try {
      // First check if user is currently locked out
      const lockoutStatus = await checkPinLockout(user.id);
      if (lockoutStatus.locked) {
        return {
          success: false,
          locked: true,
          attemptsRemaining: 0
        };
      }

      // Validate the PIN
      const isValid = await validatePin(pin);
      
      // Track the attempt
      const trackingResult = await trackPinAttempt(user.id, isValid);
      
      return {
        success: isValid,
        locked: trackingResult.locked,
        attemptsRemaining: trackingResult.attemptsRemaining
      };
    } catch (error) {
      console.error('Error validating PIN with tracking:', error);
      return { success: false, locked: false, attemptsRemaining: 5 };
    }
  };

  // Notification functionality
  const registerForNotifications = async () => {
    try {
      if (!user) {
        console.log('No user found, skipping notification registration');
        return;
      }
      
      console.log('Starting notification registration for user:', user.id);
      
      // Register for push notifications
      const token = await notificationService.registerForPushNotifications();
      console.log('Push token received:', token ? 'YES' : 'NO', token);
      
      if (token) {
        setPushToken(token);
        console.log('Storing push token in database...');
        await notificationService.storePushToken(user.id, token);
        console.log('Push token stored successfully');
      } else {
        console.log('No push token received, skipping storage');
      }
      
      // Setup notification listeners
      notificationService.setupNotificationListeners((notification) => {
        console.log('Notification received in app:', notification);
        // Handle foreground notification if needed
      });
      
      // Update permission status
      const status = await notificationService.getPermissionStatus();
      setNotificationPermissionStatus(status);
      console.log('Notification permission status:', status);
      
    } catch (error) {
      console.error('Error registering for notifications:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      // First, ensure we have a push token
      console.log('Current push token:', pushToken);
      if (!pushToken) {
        console.log('No push token found, registering for notifications first...');
        await registerForNotifications();
      }
      
      await notificationService.sendTestNotification(user.id);
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  };

  const sendPushNotification = async (userIds: string[], notificationData: NotificationData) => {
    try {
      await notificationService.sendPushNotification(userIds, notificationData);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  };

  const scheduleLocalNotification = async (notificationData: NotificationData, trigger: Date | number) => {
    try {
      return await notificationService.scheduleLocalNotification(notificationData, trigger);
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  };

  const getNotificationPermissionStatus = async () => {
    try {
      const status = await notificationService.getPermissionStatus();
      setNotificationPermissionStatus(status);
      return status;
    } catch (error) {
      console.error('Error getting notification permission status:', error);
      return 'unknown';
    }
  };

  const checkPushTokensInDatabase = async () => {
    try {
      if (!user) {
        console.log('No user found');
        return;
      }
      
      console.log('Checking push tokens in database for user:', user.id);
      
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching push tokens:', error);
        return;
      }
      
      console.log('Push tokens in database:', data);
      return data;
    } catch (error) {
      console.error('Error checking push tokens:', error);
    }
  };

  // Delivery notification functionality
  const checkDeliveryReminders = async () => {
    if (!user) return;
    
    try {
      await deliveryNotificationService.sendDeliveryNotifications(user.id);
    } catch (error) {
      console.error('Error checking delivery reminders:', error);
    }
  };

  const getDeliveryNotificationHistory = async () => {
    if (!user) return [];
    
    try {
      return await deliveryNotificationService.getDeliveryNotificationHistory(user.id);
    } catch (error) {
      console.error('Error getting delivery notification history:', error);
      return [];
    }
  };

  const manualDeliveryCheck = async () => {
    if (!user) return { reminders: [], notificationsSent: 0 };
    
    try {
      return await deliveryNotificationService.manualDeliveryCheck(user.id);
    } catch (error) {
      console.error('Error in manual delivery check:', error);
      return { reminders: [], notificationsSent: 0 };
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
    addMultipleDesigns,
    addInspiration,
    addMultipleInspirations,
        removeDesign,
        removeInspiration,
        measurementAttributes,
        updateMeasurementAttributes,
        isLoading,
        hasPinSet,
        setupPin,
        validatePin,
        removePin,
        hasSecurityQuestions,
        setupSecurityQuestions,
        validateSecurityQuestions,
        getSecurityQuestions,
        resetPinWithPassword,
        resetPinWithSecurityQuestions,
        checkPinLockoutStatus,
        validatePinWithTracking,
        notificationPermissionStatus,
        pushToken,
        registerForNotifications,
            sendTestNotification,
    sendPushNotification,
    scheduleLocalNotification,
    getNotificationPermissionStatus,
    checkPushTokensInDatabase,
        checkDeliveryReminders,
        getDeliveryNotificationHistory,
        manualDeliveryCheck,
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