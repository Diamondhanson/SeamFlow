import { StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { ThemeProvider } from "@shopify/restyle";
import { theme } from "../src/theme";
//import screens
import MyDesigns from "@/src/screens/MyDesigns";
import MyClients from "@/src/screens/MyClients";
import Home from "@/src/screens/Home";
import { ClientProvider } from '../src/context/clientContext';
import NewOrder from "@/src/screens/newOrder";
import { AppProvider } from '../src/context/AppContext';
import Welcome from "@/src/screens/Welcome";
import EnterDetails from "@/src/screens/enterDetails";


const Stack = createStackNavigator();

export default function Page() {
  return (
    <ThemeProvider theme={theme}>
      <AppProvider>
        <ClientProvider>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen 
              name="Welcome" 
              component={Welcome}
            />
            <Stack.Screen 
              name="Home" 
              component={Home}
            />
            <Stack.Screen 
              name="MyClients" 
              component={MyClients}
            />
            <Stack.Screen 
              name="MyDesigns" 
              component={MyDesigns}
            />
            <Stack.Screen 
              name="NewOrder" 
              component={NewOrder}
            />
            <Stack.Screen 
              name="EnterDetails" 
              component={EnterDetails}
            />
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
});
