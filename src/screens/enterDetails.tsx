// web 879451838140-61nh1t2425rmls49dmrje3u2b1k35i03.apps.googleusercontent.com

// android 879451838140-bv1p041seq0npbidt87sic0qd9gfntfl.apps.googleusercontent.com


// ios 879451838140-ajf5n7fqf37tobbn3ilec17jcjmee8br.apps.googleusercontent.com


// SHA 07:8A:F9:1E:D0:3F:D9:95:E0:C6:AD:C8:39:25:CA:5A:C8:2A:E1:AC

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { colors } from "../theme/colors";
import { textVariants } from "../theme/textVariants";
import { useNavigation } from "@react-navigation/native";
import { useApp } from "../context/AppContext";
import * as ImagePicker from "expo-image-picker";
import Icons from "react-native-vector-icons/FontAwesome5";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import AsyncStorage from "@react-native-async-storage/async-storage";

WebBrowser.maybeCompleteAuthSession();

const EnterDetails = () => {
  const navigation = useNavigation();
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState<string | undefined>();
  const { companyInfo,updateCompanyInfo } = useApp();
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "879451838140-bv1p041seq0npbidt87sic0qd9gfntfl.apps.googleusercontent.com",
    iosClientId: "879451838140-ajf5n7fqf37tobbn3ilec17jcjmee8br.apps.googleusercontent.com",
    webClientId: "879451838140-61nh1t2425rmls49dmrje3u2b1k35i03.apps.googleusercontent.com",
  })
  const [userInfo, setUserInfo] = useState(null);

  React.useEffect(() => {
    handleSignInResponse();
  }, [response]);

  async function handleSignInResponse() {
    if (response?.type === 'success' && response.authentication) {
      try {
        const userResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${response.authentication.accessToken}` },
        });
        
        const user = await userResponse.json();
        setUserInfo(user);
        await AsyncStorage.setItem('userInfo', JSON.stringify(user));
        
        // If you have company name from Google profile, you can set it
        if (user.name) {
          setCompanyName(user.name);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    }
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      setLogo(result.assets[0].uri);
    }
  };

  const handleProceed = () => {
    if (companyName.trim()) {
      updateCompanyInfo({
        name: companyName.trim(),
        logo: logo,
        googleUser: userInfo
      });
      navigation.navigate("Home");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}> 
        <Text style={styles.title}>Company Details</Text>

        <View style={styles.form}>
          <TouchableOpacity style={styles.logoContainer} onPress={pickImage}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <>
                <Icons name="image" size={40} color={colors.mainText} />
                <Text style={styles.logoText}>Add Logo</Text>
              </>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Enter Company Name"
            placeholderTextColor={colors.subText}
            value={companyName}
            onChangeText={setCompanyName}
          />

          <TouchableOpacity
            style={[
              styles.button,
              !companyName.trim() && styles.buttonDisabled,
            ]}
            onPress={handleProceed}
            disabled={!companyName.trim()}
          >
            <Text style={styles.buttonText}>Proceed</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={() => promptAsync()}
            disabled={!request}
          >
            <Icons name="google" size={20} color={colors.mainText} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: textVariants.H1.fontSize,
    color: colors.mainText,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    alignItems: "center",
    gap: 24,
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  logoText: {
    color: colors.mainText,
    marginTop: 8,
    fontSize: 16,
  },
  input: {
    width: "100%",
    backgroundColor: "#ffffff15",
    borderRadius: 8,
    padding: 16,
    color: colors.mainText,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: "bold",
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 12,
  },
  googleButtonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default EnterDetails;
