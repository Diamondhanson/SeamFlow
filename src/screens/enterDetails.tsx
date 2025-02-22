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
  ActivityIndicator,
  Dimensions
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
// Firebase web config
import { auth, provider } from "../../FirebaseConfig";
import { createUserWithEmailAndPassword, signInWithCredential, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useAuthRequest } from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

const EnterDetails = () => {
  const navigation = useNavigation();
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { companyInfo, updateCompanyInfo, user, setUser } = useApp();
  const [request, response] = useState(null)
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);




  async function promptAsync() {
    setLoading(true)
    await signInWithPopup(auth, provider)
      .then(async (result) => {
        await AsyncStorage.setItem('user', JSON.stringify(result.user));
        setUser(result.user)
        navigation.navigate('CustomizeMeasurementAttributes' as never);
      })
      .catch((error) => {
        console.log(error)
      })
      .finally(() => {
        setLoading(false)
      })
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
  const register = async () => {
    setLoading(true)
    await createUserWithEmailAndPassword(auth, email, password)
      .then((result) => {
        setUser(result.user)
        console.log(result.user)
        navigation.navigate('CustomizeMeasurementAttributes' as never);
      })
      .catch((error) => {
        if (error.code === 'auth/email-already-in-use') {
          alert('Email already in use')
        } else if (error.code === 'auth/invalid-email') {
          alert('Invalid email')
        } else {
          alert("Failed to register: " + error.message)
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleSubmit = async () => {
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Try to create new user first
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));
      setUser(userCredential.user);
      updateCompanyInfo({
        name: companyName,
        logo: logo || '',
      });
      navigation.navigate('CustomizeMeasurementAttributes' as never);
    } catch (error: any) {
      // If email already exists, try to sign in
      if (error.code === 'auth/email-already-in-use') {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));
          setUser(userCredential.user);
          updateCompanyInfo({
            name: companyName,
            logo: logo || '',
          });
          navigation.navigate('CustomizeMeasurementAttributes' as never);
        } catch (signInError: any) {
          if (signInError.code === 'auth/wrong-password') {
            alert('Incorrect password for existing account');
          } else if (signInError.code === 'auth/invalid-login-credentials') {
            alert('Invalid login credentials');
          } else {
            alert('Login failednn: ' + signInError.message);
          }
        }
      } else if (error.code === 'auth/invalid-email') {
        alert('Please enter a valid email address');
      } else if (error.code === 'auth/weak-password') {
        alert('Password should be at least 6 characters');
      } else {
        alert('Registration failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Text style={styles.title}>Welcome</Text>

        <View style={styles.form}>
          {/* <TouchableOpacity style={styles.logoContainer} onPress={pickImage}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <>
                <Icons name="image" size={40} color={colors.mainText} />
                <Text style={styles.logoText}>Add Logo</Text>
              </>
            )}
          </TouchableOpacity> */}

          {/* <TextInput
            style={styles.input}
            placeholder="Enter Company Name"
            placeholderTextColor={colors.subText}
            value={companyName}
            onChangeText={setCompanyName}
          /> */}
          <TextInput
            style={styles.input}
            placeholder="Enter Email"
            placeholderTextColor={colors.subText}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Enter Password"
            placeholderTextColor={colors.subText}
            value={password}
            secureTextEntry={true}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[
              styles.button,
              (!email.trim() || !password.trim()) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!email.trim() || !password.trim()}
          >
            {loading ? <ActivityIndicator size="small" color={colors.mainText} /> : <Text style={styles.buttonText}>Proceed</Text>}
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
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
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
    width: Platform.OS === "android" && Dimensions.get("window").width >= 768 ? "75%" : "100%",
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
