import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { useNavigation } from "@react-navigation/native";
import { auth } from '../../FirebaseConfig';
import { useApp } from '../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const Welcome = () => {
  const navigation = useNavigation();
  const { setUser } = useApp();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Check if user data exists in AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        
        if (userData) {
          // If we have stored user data, set it in context
          setUser(JSON.parse(userData));
          navigation.navigate('Home' as never);
          return;
        }

        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            // Store user data in AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            navigation.navigate('Home' as never);
          } else {
            navigation.navigate('EnterDetails' as never);
          }
        });

        // Cleanup subscription
        return () => unsubscribe();
      } catch (error) {
        console.error('Auth state check failed:', error);
        navigation.navigate('EnterDetails' as never);
      }
    };

    const timer = setTimeout(checkAuthState, 2000); // Reduced to 2 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>WELCOME TO</Text>
        <Text style={styles.appName}>SEAMFLOW</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  welcomeText: {
    color: colors.mainText,
    fontSize: textVariants.H2.fontSize,
    fontWeight: '500',
    letterSpacing: 2,
  },
  appName: {
    color: colors.mainText,
    fontSize: textVariants.H1.fontSize,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
});

export default Welcome;
