import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { useNavigation } from "@react-navigation/native";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Icons from "react-native-vector-icons/FontAwesome5";
import { useApp } from '../context/AppContext';

const CustomizeMeasurementAttributes = () => {
  const navigation = useNavigation();
  const { updateMeasurementAttributes } = useApp();
  const [newAttribute, setNewAttribute] = useState('');
  const [attributes, setAttributes] = useState<string[]>([]);

  const handleAddAttribute = () => {
    if (newAttribute.trim()) {
      setAttributes([...attributes, newAttribute.trim()]);
      setNewAttribute('');
    }
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (attributes.length > 0) {
      updateMeasurementAttributes(attributes);
    }
    navigation.navigate('Home');
  };

  const handleSkip = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Customize Measurements</Text>
        <Text style={styles.subtitle}>
          Add your preferred measurement attributes or skip to use our defaults
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newAttribute}
            onChangeText={setNewAttribute}
            placeholder="Enter measurement attribute..."
            placeholderTextColor={colors.subText}
            onSubmitEditing={handleAddAttribute}
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddAttribute}
          >
            <Icons name="plus" size={20} color={colors.mainText} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.attributesList}>
          {attributes.map((attribute, index) => (
            <View key={index} style={styles.attributeItem}>
              <Text style={styles.attributeText}>{attribute}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveAttribute(index)}
                style={styles.removeButton}
              >
                <Icons name="times" size={16} color={colors.subText} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
          >
            <Text style={styles.buttonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.confirmButton]}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: textVariants.H4.fontSize,
    color: colors.mainText,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: textVariants.body2.fontSize,
    color: colors.subText,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    padding: 12,
    color: colors.mainText,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attributesList: {
    flex: 1,
  },
  attributeItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attributeText: {
    fontSize: 16,
    color: colors.mainText,
  },
  removeButton: {
    padding: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#ffffff15',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomizeMeasurementAttributes;
