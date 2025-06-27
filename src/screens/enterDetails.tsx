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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Development helper for manual token entry
  const [showDevHelper, setShowDevHelper] = useState(__DEV__);
  const [devToken, setDevToken] = useState('');

  // Development helper function to manually test password reset
  const handleDevTokenTest = () => {
    if (!devToken.trim()) {
      Alert.alert('Token Required', 'Please enter a reset token from the email link');
      return;
    }
    
    Alert.alert(
      'Test Reset Token',
      'Navigate to password reset screen with this token?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            (navigation as any).navigate('PasswordReset', {
              token: devToken.trim(),
              type: 'recovery',
            });
            setDevToken('');
          }
        }
      ]
    );
  };

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
      
      // Check if this is a password reset URL
      if (url.includes('reset-password')) {
        console.log('Processing password reset from deep link:', url);
        try {
          await handlePasswordResetCallback(url);
        } catch (error) {
          console.error('Error processing password reset deep link:', error);
        }
        return;
      }
      
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
        setShowForgotPassword(false); // Hide forgot password on successful signup
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        (navigation as any).navigate('CustomizeMeasurementAttributes');
        setShowForgotPassword(false); // Hide forgot password on successful login
      }
    } catch (error: any) {
      // Show forgot password option for login errors (not signup)
      if (!isSignUp && (
        error.message.includes('Invalid login credentials') || 
        error.message.includes('Email not confirmed') ||
        error.message.includes('Invalid email or password')
      )) {
        setShowForgotPassword(true);
        Alert.alert(
          'Login Failed', 
          error.message + '\n\nNeed help accessing your account?',
          [
            { text: 'Try Again', style: 'cancel' },
            { 
              text: 'Reset Password', 
              onPress: handleForgotPassword 
            }
          ]
        );
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first, then tap "Forgot Password"');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'myapp://reset-password',
      });
      
      if (error) throw error;
      
      Alert.alert(
        'Reset Email Sent',
        `We've sent a password reset link to ${email}. 

📱 DEVELOPMENT NOTE: If the link doesn't open the app directly, copy the link from the email and test it manually, or check the Expo logs for the reset token.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setShowForgotPassword(false);
              setPassword(''); // Clear password field
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsResettingPassword(false);
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

  // Helper function to handle password reset callback
  const handlePasswordResetCallback = async (url: string) => {
    try {
      console.log('Processing password reset callback URL:', url);
      
      // Parse the callback URL for reset tokens
      const urlObj = new URL(url.replace('myapp://', 'http://localhost/'));
      
      // Check for tokens in hash
      if (urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        const token = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if (token && type === 'recovery') {
          console.log('Found password reset token, navigating to reset screen...');
          
          // Navigate to password reset screen with token
          (navigation as any).navigate('PasswordReset', {
            token: token,
            type: type,
          });
          return true;
        }
      }
      
      // Check for tokens in query params as backup
      if (urlObj.search) {
        const queryParams = new URLSearchParams(urlObj.search);
        const token = queryParams.get('access_token') || queryParams.get('token');
        const type = queryParams.get('type');
        
        if (token && type === 'recovery') {
          console.log('Found password reset token in query, navigating to reset screen...');
          
          (navigation as any).navigate('PasswordReset', {
            token: token,
            type: type,
          });
          return true;
        }
      }
      
      console.log('No password reset tokens found in callback URL');
      Alert.alert(
        'Invalid Reset Link',
        'The password reset link appears to be invalid or expired. Please request a new one.'
      );
      return false;
      
    } catch (error) {
      console.error('Error processing password reset callback:', error);
      Alert.alert(
        'Error',
        'There was an error processing the password reset link. Please try requesting a new one.'
      );
      throw error;
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

          {/* Help text for forgot password */}
          {!isSignUp && !showForgotPassword && (
            <Text style={styles.helpText}>
              Trouble signing in? Enter your email and password, then try again. 
              A "Forgot Password" option will appear if needed.
            </Text>
          )}

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

          {/* Forgot Password Section */}
          {showForgotPassword && !isSignUp && (
            <View style={styles.forgotPasswordSection}>
              <View style={styles.forgotPasswordHeader}>
                <Icons name="info-circle" size={14} color={colors.info} />
                <Text style={styles.forgotPasswordHeaderText}>
                  Need help accessing your account?
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.forgotPasswordButton,
                  (!email.trim()) && styles.forgotPasswordButtonDisabled
                ]}
                onPress={handleForgotPassword}
                disabled={isResettingPassword || !email.trim()}
              >
                {isResettingPassword ? (
                  <View style={styles.forgotPasswordContent}>
                    <ActivityIndicator size="small" color={colors.warning} />
                    <Text style={[styles.forgotPasswordText, { marginLeft: 8 }]}>
                      Sending reset email...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.forgotPasswordContent}>
                    <Icons name="key" size={16} color={colors.warning} />
                    <Text style={styles.forgotPasswordText}>
                      {!email.trim() ? 'Enter email above first' : 'Send Password Reset Email'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setShowForgotPassword(false); // Hide forgot password when switching modes
            }}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>

          {/* Development Helper - Only visible in DEV mode */}
          {showDevHelper && (
            <View style={styles.devHelperContainer}>
              <Text style={styles.devHelperTitle}>🛠️ Development Helper</Text>
              <Text style={styles.devHelperText}>
                If deep linking isn't working, copy the token from the reset email and paste below:
              </Text>
              
              <TextInput
                style={styles.devTokenInput}
                placeholder="Paste reset token here (access_token from email link)"
                placeholderTextColor={colors.subText}
                value={devToken}
                onChangeText={setDevToken}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TouchableOpacity
                style={[styles.devButton, !devToken.trim() && styles.buttonDisabled]}
                onPress={handleDevTokenTest}
                disabled={!devToken.trim()}
              >
                <Text style={styles.devButtonText}>Test Reset Token</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.devCloseButton}
                onPress={() => setShowDevHelper(false)}
              >
                <Text style={styles.devCloseText}>Hide Helper</Text>
              </TouchableOpacity>
            </View>
          )}
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
  forgotPasswordButton: {
    backgroundColor: colors.warning + '15', // Semi-transparent warning color
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    width: "100%",
    alignItems: "center",
  },
  forgotPasswordContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPasswordText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 8,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  forgotPasswordSection: {
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 8,
  },
  forgotPasswordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  forgotPasswordHeaderText: {
    color: colors.info,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  forgotPasswordButtonDisabled: {
    opacity: 0.5,
  },
  devHelperContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.warning,
    marginTop: 20,
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
  },
  devHelperTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.warning,
    textAlign: 'center',
    marginBottom: 8,
  },
  devHelperText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  devTokenInput: {
    backgroundColor: "#ffffff15",
    borderRadius: 8,
    padding: 12,
    color: colors.mainText,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  devButton: {
    backgroundColor: colors.warning,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  devButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "600",
  },
  devCloseButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  devCloseText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});

export default EnterDetails;
