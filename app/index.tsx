import React from 'react';
import { Dimensions, ScaledSize, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { ThemeProvider } from "@shopify/restyle";
import { theme } from "../src/theme";
//import screens
import MyDesigns from "@/src/screens/MyDesigns";
import MyClients from "@/src/screens/MyClients";
import Home from "@/src/screens/Home";
import { ClientProvider } from "../src/context/clientContext";
import NewOrder from "@/src/screens/newOrder";
import { AppProvider, useApp } from "../src/context/AppContext";
import Welcome from "@/src/screens/Welcome";
import EnterDetails from "@/src/screens/enterDetails";
import CalendarScreen from "@/src/screens/calender";
import CustomizeMeasurementAttributes from "@/src/screens/CustomizeMeasurementAttributes";
import Settings from "@/src/screens/Settings";
import { useState, useEffect } from "react";

const Stack = createStackNavigator();

function NavigationStack() {
  const [screen, setScreen] = useState(Dimensions.get("window"));
  
  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => setScreen(window);
    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription.remove();
  }, []);

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="EnterDetails" component={EnterDetails} />
      <Stack.Group>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="MyClients" component={MyClients} />
        <Stack.Screen name="MyDesigns" component={MyDesigns} />
        <Stack.Screen name="NewOrder" component={NewOrder} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="CustomizeMeasurementAttributes" component={CustomizeMeasurementAttributes} />
        <Stack.Screen name="Settings" component={Settings} />
      </Stack.Group>
    </Stack.Navigator>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <ThemeProvider theme={theme}>
        <ClientProvider>
          <NavigationStack />
        </ClientProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  main: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 960,
    marginHorizontal: "auto",
  },
  title: {
    fontSize: 64,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 36,
    color: "#38434D",
  },
  landscape: {
    flexDirection: "row", // Adjust layout for landscape
  },
});
