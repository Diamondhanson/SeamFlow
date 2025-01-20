import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { theme } from "../theme";
import { textVariants } from "../theme/textVariants";
import Icons from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { useApp } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;

const Home = () => {
  const navigation = useNavigation();
  const { companyInfo } = useApp();
  const [dimensions, setDimensions] = useState({ 
    window: Dimensions.get('window') 
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }) => {
        setDimensions({ window });
      }
    );
    return () => subscription?.remove();
  }, []);

  const { width } = dimensions.window;
  const isTabletLayout = width >= 768;
  const tileSize = isTabletLayout ? 220 : 160;
  const containerPadding = isTabletLayout ? 32 : 16;

  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[
          styles.titleContainer,
          { paddingHorizontal: containerPadding }
        ]}>
          <Text style={[
            styles.title,
            isTabletLayout && styles.tabletTitle
          ]}>
            {companyInfo.name}
          </Text>
        </View>
        
        <View style={[
          styles.tilesContainer,
          { padding: containerPadding }
        ]}>
          <TouchableOpacity 
            style={[
              styles.tiles,
              { width: tileSize, height: tileSize }
            ]}
            onPress={() => navigation.navigate("NewOrder")}
          >
            <Text style={[
              styles.text,
              isTabletLayout && styles.tabletText
            ]}>New order</Text>
            <Icons 
              name="border-all" 
              size={isTabletLayout ? 80 : 60} 
              color={theme.colors.mainText} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tiles,
              { width: tileSize, height: tileSize }
            ]}
            onPress={() => navigation.navigate("MyClients")}
          >
            <Text style={[
              styles.text,
              isTabletLayout && styles.tabletText
            ]}>My clients</Text>
            <Icons 
              name="person-booth" 
              size={isTabletLayout ? 80 : 60} 
              color={theme.colors.mainText} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tiles,
              { width: tileSize, height: tileSize }
            ]}
            onPress={() => navigation.navigate("MyDesigns")}
          >
            <Text style={[
              styles.text,
              isTabletLayout && styles.tabletText
            ]}>My designs</Text>
            <Icons 
              name="icons" 
              size={isTabletLayout ? 80 : 60} 
              color={theme.colors.mainText} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tiles,
              { width: tileSize, height: tileSize }
            ]}
            onPress={() => navigation.navigate("Calendar")}
          >
            <Text style={[
              styles.text,
              isTabletLayout && styles.tabletText
            ]}>Calendar</Text>
            <Icons 
              name="business-time" 
              size={isTabletLayout ? 80 : 60} 
              color={theme.colors.mainText} 
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  titleContainer: {
    width: '100%',
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.mainText,
    textAlign: 'center',
  },
  tabletText: {
    fontSize: 24,
  },
  tiles: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: textVariants.H6.fontSize,
    fontWeight: "bold",
    color: theme.colors.mainText,
    fontFamily: "Poppins_700Bold",
  },
  tabletTitle: {
    fontSize: 40,
  },
});

export default Home;
