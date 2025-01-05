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

const EnterDetails = () => {
  const navigation = useNavigation();
  const { updateCompanyInfo } = useApp();
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState<string | undefined>();

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
});

export default EnterDetails;
