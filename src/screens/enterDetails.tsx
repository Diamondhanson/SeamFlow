// web 879451838140-61nh1t2425rmls49dmrje3u2b1k35i03.apps.googleusercontent.com

// android 879451838140-bv1p041seq0npbidt87sic0qd9gfntfl.apps.googleusercontent.com


// ios 879451838140-ajf5n7fqf37tobbn3ilec17jcjmee8br.apps.googleusercontent.com


// SHA 07:8A:F9:1E:D0:3F:D9:95:E0:C6:AD:C8:39:25:CA:5A:C8:2A:E1:AC

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert
} from "react-native";
import { colors } from "../theme/colors";
import { textVariants } from "../theme/textVariants";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../supabaseConfig";
import Icons from "react-native-vector-icons/FontAwesome5";
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '../context/AppContext';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

const EnterDetails = () => {
  const navigation = useNavigation();
  const { session } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Handle OAuth callback from deep link
  useEffect(() => {
    if (session) {
      setLoading(false); // Reset loading state when session is established
      (navigation as any).navigate('CustomizeMeasurementAttributes');
    }
  }, [session, navigation]);

  // Handle deep link URLs (fallback for direct app launches)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      console.log('Received deep link URL:', url);
      
      // Check if this is an OAuth callback URL (fallback handling)
      if (url.includes('/auth/callback')) {
        console.log('Processing OAuth callback from deep link:', url);
        try {
          await handleAuthCallback(url);
        } catch (error) {
          console.error('Error processing deep link OAuth callback:', error);
        }
      }
    };

    // Listen for deep link URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => subscription?.remove();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        if (error) throw error;
        Alert.alert('Success', 'Account created! Please check your email for verification.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        (navigation as any).navigate('CustomizeMeasurementAttributes');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      // Use the proper app scheme for redirect URL
      const redirectUrl = 'myapp://auth/callback';
      console.log('Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      
      // Get the OAuth URL and open it in browser
      if (data?.url) {
        console.log('Opening OAuth URL:', data.url);
        
        // Open the OAuth URL in the system browser with proper return URL handling
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: false, // Don't show in recent apps
            createTask: false, // Don't create a new task
          }
        );
        
        console.log('OAuth result:', result);
        
        if (result.type === 'success' && result.url) {
          // Process the callback URL directly
          console.log('OAuth success, processing callback URL:', result.url);
          await handleAuthCallback(result.url);
        } else if (result.type === 'cancel') {
          console.log('User cancelled OAuth');
        } else if (result.type === 'dismiss') {
          console.log('OAuth dismissed');
        }
      } else {
        throw new Error('No OAuth URL received from Supabase');
      }
      
    } catch (error: any) {
      console.error('OAuth error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to handle auth callback
  const handleAuthCallback = async (url: string) => {
    try {
      console.log('Processing callback URL:', url);
      
      // Parse the callback URL for OAuth tokens
      const urlObj = new URL(url.replace('myapp://', 'http://localhost/'));
      
      // Check for tokens in hash (OAuth standard)
      if (urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          console.log('Found OAuth tokens, setting session...');
          
          // Set the session directly with the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Error setting session:', error);
            throw error;
          } else {
            console.log('OAuth session established successfully');
            return true;
          }
        }
      }
      
      // Check for tokens in query params as backup
      if (urlObj.search) {
        const queryParams = new URLSearchParams(urlObj.search);
        const accessToken = queryParams.get('access_token');
        const refreshToken = queryParams.get('refresh_token');
        
        if (accessToken) {
          console.log('Found OAuth tokens in query, setting session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Error setting session:', error);
            throw error;
          } else {
            console.log('OAuth session established successfully');
            return true;
          }
        }
      }
      
      console.log('No tokens found in callback URL');
      return false;
      
    } catch (error) {
      console.error('Error processing OAuth callback:', error);
      throw error;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Text style={styles.title}>Welcome to SeamFlow</Text>

        <View style={styles.form}>
          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.mainText} />
            ) : (
              <>
                <Icons name="google" size={20} color={colors.mainText} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password Form */}
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            placeholderTextColor={colors.subText}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            placeholderTextColor={colors.subText}
            value={password}
            secureTextEntry={true}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[
              styles.button,
              (!email.trim() || !password.trim()) && styles.buttonDisabled,
            ]}
            onPress={handleAuth}
            disabled={!email.trim() || !password.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.mainText} />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: textVariants.H1.fontSize,
    color: colors.mainText,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    alignItems: "center",
    gap: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    gap: 12,
  },
  googleButtonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.subText,
    opacity: 0.3,
  },
  dividerText: {
    color: colors.subText,
    marginHorizontal: 15,
    fontSize: 14,
  },
  input: {
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    backgroundColor: "#ffffff15",
    borderRadius: 8,
    padding: 16,
    color: colors.mainText,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: "bold",
  },
  switchButton: {
    marginTop: 16,
  },
  switchText: {
    color: colors.primary,
    fontSize: 14,
  },
});

export default EnterDetails;
