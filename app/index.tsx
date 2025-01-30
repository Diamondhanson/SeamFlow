import { Dimensions, ScaledSize, StyleSheet, View } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { ThemeProvider } from "@shopify/restyle";
import { theme } from "../src/theme";
//import screens
import MyDesigns from "@/src/screens/MyDesigns";
import MyClients from "@/src/screens/MyClients";
import Home from "@/src/screens/Home";
import { ClientProvider } from "../src/context/clientContext";
import NewOrder from "@/src/screens/newOrder";
import { AppProvider } from "../src/context/AppContext";
import Welcome from "@/src/screens/Welcome";
import EnterDetails from "@/src/screens/enterDetails";
import CalendarScreen from "@/src/screens/calender";
import { useState, useEffect } from "react";

const Stack = createStackNavigator();

export default function Page() {
  const [screen, setScreen] = useState(Dimensions.get("window"));
  
  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => setScreen(window);
    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription.remove();
  }, []);

  const isLandscape = screen.width > screen.height;

  return (
      <ThemeProvider theme={theme}>
        <AppProvider>
          <ClientProvider>
            <Stack.Navigator
              initialRouteName="Welcome"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Welcome" component={Welcome} />
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="MyClients" component={MyClients} />
              <Stack.Screen name="MyDesigns" component={MyDesigns} />
              <Stack.Screen name="NewOrder" component={NewOrder} />
              <Stack.Screen name="EnterDetails" component={EnterDetails} />
              <Stack.Screen name="Calendar" component={CalendarScreen} />
            </Stack.Navigator>
          </ClientProvider>
        </AppProvider>
      </ThemeProvider>
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
