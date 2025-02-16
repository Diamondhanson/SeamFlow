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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

const CustomizeMeasurementAttributes = () => {
  const navigation = useNavigation();
  const { updateMeasurementAttributes, user, measurementAttributes } = useApp();
  const [newAttribute, setNewAttribute] = useState('');
  const [attributes, setAttributes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial data from Firestore
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.measurementAttributes) {
              setAttributes(userData.measurementAttributes);
            } else {
              // Use the current measurementAttributes from context if no Firestore data
              setAttributes(measurementAttributes);
            }
          } else {
            // Use the current measurementAttributes from context if no user doc
            setAttributes(measurementAttributes);
          }
        }
      } catch (error) {
        console.error('Error loading measurement attributes:', error);
        // Fallback to current measurementAttributes on error
        setAttributes(measurementAttributes);
      } finally {
        setIsLoading(false);
        setDataLoaded(true);
      }
    };

    loadData();
  }, [user, measurementAttributes]);

  const handleAddAttribute = () => {
    if (!dataLoaded) return;
    
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
    if (!dataLoaded) return;
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!dataLoaded || attributes.length === 0) return;

    setIsSaving(true);
    try {
      await updateMeasurementAttributes(attributes);
      navigation.navigate('Home' as never);
    } catch (error) {
      console.error('Error saving measurement attributes:', error);
      alert('Failed to save measurement attributes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Home' as never);
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading measurement attributes...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Customize Measurements</Text>
        <Text style={styles.subtitle}>
          Add your preferred measurement attributes or skip to use our defaults
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, (!dataLoaded || isSaving) && styles.inputDisabled]}
            value={newAttribute}
            onChangeText={setNewAttribute}
            placeholder="Enter measurement attribute..."
            placeholderTextColor={colors.subText}
            onSubmitEditing={handleAddAttribute}
            editable={dataLoaded && !isSaving}
          />
          <TouchableOpacity 
            style={[styles.addButton, (!dataLoaded || isSaving || !newAttribute.trim()) && styles.buttonDisabled]}
            onPress={handleAddAttribute}
            disabled={!dataLoaded || isSaving || !newAttribute.trim()}
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
                style={[styles.removeButton, (!dataLoaded || isSaving) && styles.buttonDisabled]}
                disabled={!dataLoaded || isSaving}
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
              (!dataLoaded || isSaving || attributes.length === 0) && styles.buttonDisabled
            ]}
            onPress={handleConfirm}
            disabled={!dataLoaded || isSaving || attributes.length === 0}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.mainText,
    marginTop: 16,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CustomizeMeasurementAttributes;
