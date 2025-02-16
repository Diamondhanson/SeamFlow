import React, { ReactNode, useEffect } from 'react';
import { Dimensions, SafeAreaView, StyleSheet, View, StatusBar } from 'react-native';
import { colors } from '../theme/colors';


const {height} = Dimensions.get('screen');

interface Props {
  children: ReactNode;
}

const SafeAreaWrapper = ({ children }: Props) => {

useEffect(()=>{
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(colors.background);
},[])
  return (
    <View style={[styles.container, { height: height }]}>
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