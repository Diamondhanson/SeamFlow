import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import Icons from "react-native-vector-icons/FontAwesome5";

interface HeaderProps {
  title: string;
  onBack: () => void;
}

const Header = ({ title, onBack }: HeaderProps) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Icons 
            name="arrow-left" 
            size={24} 
            color={colors.mainText}
          />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {/* Empty View for balanced spacing */}
        <View style={styles.backButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0, // Space for notch
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: textVariants.body3.fontSize,
    color: colors.mainText,
    fontWeight: '600',
  },
});

export default Header;
