import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { theme } from "../theme";
import { textVariants } from "../theme/textVariants";
import Icons from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { useApp } from '../context/AppContext';
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;

// Define the tile data structure
interface TileData {
  id: string;
  title: string;
  icon: string;
  route: string;
}

// Define the tiles data
const TILES_DATA: TileData[] = [
  {
    id: '1',
    title: 'New order',
    icon: 'border-all',
    route: 'NewOrder'
  },
  {
    id: '2',
    title: 'My clients',
    icon: 'person-booth',
    route: 'MyClients'
  },
  {
    id: '3',
    title: 'My designs',
    icon: 'icons',
    route: 'MyDesigns'
  },
  {
    id: '4',
    title: 'Calendar',
    icon: 'business-time',
    route: 'Calendar'
  },
  {
    id: '5',
    title: 'My inspirations',
    icon: 'lightbulb',
    route: 'MyInspirations'
  }
  ,
  {
    id: '6',
    title: 'Bulk Order',
    icon: 'boxes',
    route: 'BulkOrder'
  }
];

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
  const tileSize = isTabletLayout ? 220 : 155;
  const containerPadding = isTabletLayout ? 32 : 16;
  const logoSize = isTabletLayout ? 60 : 40;

  const renderTile = ({ id, title, icon, route }: TileData) => (
    <TouchableOpacity 
      key={id}
      style={[
        styles.tiles,
        { width: tileSize, height: tileSize }
      ]}
      onPress={() => navigation.navigate(route)}
    >
      <Text style={[
        styles.text,
        isTabletLayout && styles.tabletText
      ]}>{title}</Text>
      <Icons 
        name={icon} 
        size={isTabletLayout ? 80 : 60} 
        color={theme.colors.mainText} 
      />
    </TouchableOpacity>
  );

  return (
    // <SafeAreaWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[
          styles.titleContainer,
          { paddingHorizontal: containerPadding }
        ]}>
          <View style={styles.titleLeftSection}>
            {companyInfo.logo ? (
              <Image 
                source={{ uri: companyInfo.logo }} 
                style={[styles.logo, { width: logoSize, height: logoSize }]} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.logoPlaceholder, { width: logoSize, height: logoSize }]}>
                <Icons name="store" size={logoSize/2} color={theme.colors.mainText} />
              </View>
            )}
            <Text style={[
              styles.title,
              isTabletLayout && styles.tabletTitle
            ]}>
              {companyInfo.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            style={styles.settingsButton}
          >
            <Icons name="cog" size={24} color={theme.colors.mainText} />
          </TouchableOpacity>
        </View>
        
        <View style={[
          styles.tilesContainer,
          { padding: containerPadding }
        ]}>
          {TILES_DATA.map(renderTile)}
        </View>
      </ScrollView>
    // </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  titleContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 20,
  },
  titleLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  logoPlaceholder: {
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
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
  settingsButton: {
    padding: 10,
  },
});

export default Home;
