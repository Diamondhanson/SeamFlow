import React, { ReactNode } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
}

const SafeAreaWrapper = ({ children }: Props) => {
  return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.content}>
          {children}
        </View>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
   
  },
});

export default SafeAreaWrapper; 