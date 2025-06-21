import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { defaultStyles, themeUtils } from '../theme';
import Icons from "react-native-vector-icons/FontAwesome5";
import { Dimensions } from 'react-native';

interface HeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
  subtitle?: string;
  showBackButton?: boolean;
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const Header = ({ 
  title, 
  onBack, 
  rightElement, 
  subtitle, 
  showBackButton = true 
}: HeaderProps) => {  
  return (
    <>
      {/* Status Bar */}
      <StatusBar 
        barStyle="light-content"
        backgroundColor={colors.background}
        translucent={false}
      />
      
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {/* Left Section - Back Button */}
          <View style={styles.leftSection}>
            {showBackButton && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={onBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Icons 
                  name="arrow-left" 
                  size={isTablet ? 22 : 20} 
                  color={colors.text}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Center Section - Title & Subtitle */}
          <View style={styles.centerSection}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {/* Right Section - Optional Element */}
          <View style={styles.rightSection}>
            {rightElement || <View style={styles.placeholder} />}
          </View>
        </View>
        
        {/* Subtle border */}
        <View style={styles.borderLine} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: spacing.headerHeight,
    paddingHorizontal: spacing.page,
    backgroundColor: colors.background,
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.round,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('xs'),
    // Subtle hover effect
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
  },
  title: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 2,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  borderLine: {
    height: 1,
    backgroundColor: colors.divider,
    opacity: 0.6,
    marginHorizontal: spacing.page,
  },
});

export default Header;
