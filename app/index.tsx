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
import BulkOrder from '@/src/screens/BulkOrderModule/BulkOrder';
import AddBulkOrder from '@/src/screens/BulkOrderModule/AddBulkOrder';
import SafeAreaWrapper from '@/src/components/SafeAreaWrapper';
import { StatusBar } from 'react-native';
import { colors } from '@/src/theme/colors';

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
        <Stack.Screen name="BulkOrder" component={BulkOrder} />
        <Stack.Screen name="AddBulkOrder" component={AddBulkOrder} />
      </Stack.Group>
    </Stack.Navigator>
  );
}

export default function Page() {
  return (
    <>
      {/* <StatusBar 
        barStyle="light-content"
        backgroundColor={colors.background}
        translucent
      /> */}
      <AppProvider>
        <ThemeProvider theme={theme}>
          <ClientProvider>
            <NavigationStack />
          </ClientProvider>
        </ThemeProvider>
      </AppProvider>
    </>
  );
}


