import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
import { useNavigation } from "@react-navigation/native";
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';
import Icons from "react-native-vector-icons/FontAwesome5";
import { useApp } from '../context/AppContext';

const ChangeMeasurementAttributes = () => {
  const navigation = useNavigation();
  const { updateMeasurementAttributes, measurementAttributes } = useApp();
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
      } else {
        Alert.alert('Duplicate', 'This measurement attribute already exists.');
      }
    }
  };

  const handleRemoveAttribute = (index: number) => {
    Alert.alert(
      'Remove Attribute',
      'Are you sure you want to remove this measurement attribute?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setAttributes(prev => prev.filter((_, i) => i !== index))
        }
      ]
    );
  };

  const handleConfirm = async () => {
    if (attributes.length === 0) {
      Alert.alert('Error', 'Please add at least one measurement attribute.');
      return;
    }

    setIsSaving(true);
    try {
      await updateMeasurementAttributes(attributes);
      Alert.alert(
        'Success', 
        'Measurement attributes updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating attributes:', error);
      Alert.alert('Error', 'Failed to update measurement attributes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <Header 
        title="Edit Measurements" 
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
            <Icons name="ruler-combined" size={32} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.title}>Measurement Attributes</Text>
          <Text style={styles.subtitle}>
            Customize the measurement fields used throughout your app
          </Text>
        </View>

        {/* Add New Attribute Section */}
        <View style={styles.addSection}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary }]}>
              <Icons name="plus" size={16} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.sectionTitle}>Add New Attribute</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, isSaving && styles.inputDisabled]}
              value={newAttribute}
              onChangeText={setNewAttribute}
              placeholder="Enter measurement attribute (e.g., shoulder, waist...)"
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={handleAddAttribute}
              editable={!isSaving}
            />
            <TouchableOpacity 
              style={[styles.addButton, (!newAttribute.trim() || isSaving) && styles.buttonDisabled]}
              onPress={handleAddAttribute}
              disabled={!newAttribute.trim() || isSaving}
            >
              <Icons name="plus" size={20} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Attributes Section */}
        <View style={styles.attributesSection}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.secondary }]}>
              <Icons name="list" size={16} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.sectionTitle}>Current Attributes ({attributes.length})</Text>
          </View>

          {attributes.length === 0 ? (
            <View style={styles.emptyState}>
              <Icons name="inbox" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Attributes Added</Text>
              <Text style={styles.emptyMessage}>
                Start by adding your first measurement attribute above
              </Text>
            </View>
          ) : (
            <View style={styles.attributesList}>
              {attributes.map((attribute, index) => (
                <View key={index} style={styles.attributeItem}>
                  <View style={styles.attributeContent}>
                    <View style={[styles.attributeIcon, { backgroundColor: colors.info }]}>
                      <Icons name="ruler" size={12} color={colors.textOnPrimary} />
                    </View>
                    <Text style={styles.attributeText}>{attribute}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveAttribute(index)}
                    style={[styles.removeButton, isSaving && styles.buttonDisabled]}
                    disabled={isSaving}
                  >
                    <Icons name="trash" size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Confirm Button */}
        <View style={styles.confirmSection}>
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              (isSaving || attributes.length === 0) && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={isSaving || attributes.length === 0}
          >
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
                <Text style={styles.confirmButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Icons name="check" size={20} color={colors.textOnPrimary} />
                <Text style={styles.confirmButtonText}>Confirm Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header Section
  headerSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    margin: spacing.page,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('s'),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
    ...themeUtils.getElevation('xs'),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Section Styles
  addSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    margin: spacing.page,
    marginTop: 0,
    padding: spacing.l,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  attributesSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.l,
    margin: spacing.page,
    marginTop: 0,
    padding: spacing.l,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },

  // Input Section
  inputContainer: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.m,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.m,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('xs'),
  },

  // Attributes List
  attributesList: {
    gap: spacing.s,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.m,
    borderRadius: spacing.borderRadius.m,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  attributeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attributeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
  },
  attributeText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  removeButton: {
    padding: spacing.s,
    borderRadius: spacing.borderRadius.s,
    backgroundColor: colors.backgroundTertiary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Confirm Section
  confirmSection: {
    padding: spacing.page,
  },
  confirmButton: {
    backgroundColor: colors.success,
    borderRadius: spacing.borderRadius.l,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    ...themeUtils.getElevation('m'),
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },

  // Common
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ChangeMeasurementAttributes; 