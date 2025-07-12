import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { useNavigation } from "@react-navigation/native";
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
// LinearGradient removed for now - can be added later if needed

const { width, height } = Dimensions.get('window');

const Welcome = () => {
  const navigation = useNavigation();
  const { session } = useApp();
  const { t } = useTranslation();
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigation timer
    const timer = setTimeout(() => {
      if (session) {
        (navigation as any).navigate('Home');
      } else {
        (navigation as any).navigate('EnterDetails');
      }
    }, 2500); // Slightly longer to appreciate the design

    return () => clearTimeout(timer);
  }, [session, fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
          {/* Brand Mark */}
          <View style={styles.brandMark}>
            <View style={styles.brandIcon}>
              {/* Stylized needle/thread icon */}
              <View style={styles.needleIcon} />
              <View style={styles.threadIcon} />
            </View>
          </View>

          {/* Welcome Text */}
          <View style={styles.textContainer}>
            <Text style={styles.welcomeText}>{t('welcome.title')}</Text>
            <Text style={styles.appName}>{t('welcome.appName')}</Text>
            <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorativeElements}>
            <View style={[styles.decorativeLine, styles.leftLine]} />
            <View style={styles.decorativeCenter}>
              <View style={styles.decorativeDot} />
            </View>
            <View style={[styles.decorativeLine, styles.rightLine]} />
          </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    maxWidth: 400,
    width: '100%',
  },
  brandMark: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  brandIcon: {
    width: 80,
    height: 80,
    borderRadius: spacing.borderRadius.round,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  needleIcon: {
    width: 3,
    height: 40,
    backgroundColor: colors.textOnSecondary,
    borderRadius: 2,
    position: 'absolute',
    transform: [{ rotate: '15deg' }],
  },
  threadIcon: {
    width: 20,
    height: 2,
    backgroundColor: colors.textOnSecondary,
    borderRadius: 1,
    position: 'absolute',
    top: 45,
    left: 35,
    opacity: 0.8,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  welcomeText: {
    ...textVariants.label,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
    opacity: 0.9,
    letterSpacing: 3,
  },
  appName: {
    ...textVariants.display,
    color: colors.textOnPrimary,
    marginBottom: spacing.sm,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    ...textVariants.bodySmall,
    color: colors.textOnPrimary,
    opacity: 0.8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  decorativeElements: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginTop: spacing.l,
  },
  decorativeLine: {
    height: 1,
    flex: 1,
    backgroundColor: colors.textOnPrimary,
    opacity: 0.3,
  },
  leftLine: {
    marginRight: spacing.m,
  },
  rightLine: {
    marginLeft: spacing.m,
  },
  decorativeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: spacing.borderRadius.round,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default Welcome;
