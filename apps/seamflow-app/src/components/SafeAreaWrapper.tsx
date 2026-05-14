import React, { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  children: ReactNode;
}

const SafeAreaWrapper = ({ children }: Props) => {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default SafeAreaWrapper; 