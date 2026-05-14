import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get('window');

const Welcome = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('EnterDetails');
    }, 3000); // 3 seconds

    return () => clearTimeout(timer); // Cleanup timer on unmount
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
