import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { useNavigation } from "@react-navigation/native";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Icons from "react-native-vector-icons/FontAwesome5";
import { useApp } from '../context/AppContext';

const CustomizeMeasurementAttributes = () => {
  const navigation = useNavigation();
  const { updateMeasurementAttributes, user, measurementAttributes } = useApp();
  const [newAttribute, setNewAttribute] = useState('');
  const [attributes, setAttributes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize attributes from context
  useEffect(() => {
    setAttributes(measurementAttributes);
  }, [measurementAttributes]);

  const handleAddAttribute = () => {
    if (newAttribute.trim()) {
      // Check for duplicates (case-insensitive)
      const normalizedNewAttr = newAttribute.trim().toLowerCase();
      if (!attributes.some(attr => attr.toLowerCase() === normalizedNewAttr)) {
        setAttributes(prev => [...prev, newAttribute.trim()]);
        setNewAttribute('');
      }
    }
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (attributes.length === 0) return;

    setIsSaving(true);
    try {
      await updateMeasurementAttributes(attributes);
      (navigation as any).navigate('Home');
    } catch (error) {
      console.error('Error saving measurement attributes:', error);
      alert('Failed to save measurement attributes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    (navigation as any).navigate('Home');
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
            style={[styles.input, isSaving && styles.inputDisabled]}
            value={newAttribute}
            onChangeText={setNewAttribute}
            placeholder="Enter measurement attribute..."
            placeholderTextColor={colors.subText}
            onSubmitEditing={handleAddAttribute}
            editable={!isSaving}
          />
          <TouchableOpacity 
            style={[styles.addButton, (isSaving || !newAttribute.trim()) && styles.buttonDisabled]}
            onPress={handleAddAttribute}
            disabled={isSaving || !newAttribute.trim()}
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
                style={[styles.removeButton, isSaving && styles.buttonDisabled]}
                disabled={isSaving}
              >
                <Icons name="times" size={16} color={colors.subText} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.skipButton, isSaving && styles.buttonDisabled]}
            onPress={handleSkip}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.confirmButton,
              (isSaving || attributes.length === 0) && styles.buttonDisabled
            ]}
            onPress={handleConfirm}
            disabled={isSaving || attributes.length === 0}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving...' : 'Confirm'}
            </Text>
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
  inputDisabled: {
    opacity: 0.5,
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
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CustomizeMeasurementAttributes;
