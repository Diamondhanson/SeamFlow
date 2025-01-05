import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import React from "react";
import { ScrollView } from "react-native-gesture-handler";
import { theme } from "../theme";
import { textVariants } from "../theme/textVariants";
import Icons from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { useApp } from '../context/AppContext';

const { height, width } = Dimensions.get("window");

const Home = () => {
  const navigation = useNavigation();
  const { companyInfo } = useApp();

  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{companyInfo.name}</Text>
        </View>
        <View style={styles.tilesContainer}>
          <TouchableOpacity 
            style={styles.tiles}
            onPress={() => navigation.navigate("NewOrder")}
          >
            <Text style={styles.text}>New order</Text>
            <Icons name="border-all" size={60} color={theme.colors.mainText} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tiles}
            onPress={() => navigation.navigate("MyClients")}
          >
            <Text style={styles.text}>My clients</Text>
            <Icons name="person-booth" size={60} color={theme.colors.mainText} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tiles}
            onPress={() => navigation.navigate("MyDesigns")}
          >
            <Text style={styles.text}>My designs</Text>
            <Icons name="icons" size={60} color={theme.colors.mainText} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tiles}>
            <Text style={styles.text}>calender</Text>
            <Icons name="business-time" size={60} color={theme.colors.mainText} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
  },
  titleContainer: {
    width: width * 0.95,
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 20,
  },
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    marginTop: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.mainText,
  },
  tiles: {
    backgroundColor: theme.colors.primary,
    width: 180,
    height: 180,
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  title: {
    fontSize: textVariants.H1.fontSize,
    fontWeight: "bold",
    color: theme.colors.mainText,
    fontFamily: "Poppins_700Bold",
  },
});

export default Home;
