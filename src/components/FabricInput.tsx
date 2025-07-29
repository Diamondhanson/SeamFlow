import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';

interface FabricInputProps {
  selectedFabrics: string[];
  onFabricsChange: (fabrics: string[]) => void;
  label?: string;
}

const FabricInput: React.FC<FabricInputProps> = ({
  selectedFabrics,
  onFabricsChange,
  label = 'Fabrics',
}) => {
  const [fabricInput, setFabricInput] = useState('');

  const handleAddFabric = () => {
    const fabric = fabricInput.trim();
    if (!fabric) {
      Alert.alert('Invalid Input', 'Please enter a fabric name');
      return;
    }

    // Check if fabric already exists (case insensitive)
    const exists = selectedFabrics.some(f => f.toLowerCase() === fabric.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Fabric', 'This fabric is already added');
      return;
    }

    onFabricsChange([...selectedFabrics, fabric]);
    setFabricInput('');
  };

  const removeFabric = (fabricToRemove: string) => {
    onFabricsChange(selectedFabrics.filter(f => f !== fabricToRemove));
  };

  const clearAllFabrics = () => {
    Alert.alert(
      'Clear All Fabrics',
      'Are you sure you want to remove all selected fabrics?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => onFabricsChange([]) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {selectedFabrics.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearAllFabrics}
          >
            <MaterialIcons name="clear-all" size={18} color={colors.error} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fabric Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.fabricInput}
          placeholder="Enter fabric name (e.g., Cotton, Silk, etc.)"
          value={fabricInput}
          onChangeText={setFabricInput}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleAddFabric}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddFabric}
        >
          <MaterialIcons name="add" size={20} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Selected Fabrics */}
      {selectedFabrics.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>Selected Fabrics ({selectedFabrics.length}):</Text>
          <View style={styles.selectedFabrics}>
            {selectedFabrics.map((fabric, index) => (
              <View key={index} style={styles.fabricChip}>
                <Text style={styles.fabricChipText}>{fabric}</Text>
                <TouchableOpacity
                  style={styles.removeChipButton}
                  onPress={() => removeFabric(fabric)}
                >
                  <MaterialIcons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.l,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  label: {
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.m,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  clearText: {
    fontSize: textVariants.body2.fontSize,
    color: colors.error,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.m,
  },
  fabricInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    padding: spacing.sm,
    color: colors.text,
    fontSize: textVariants.body2.fontSize,
    minHeight: 48,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.m,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedContainer: {
    marginBottom: spacing.m,
  },
  selectedLabel: {
    fontSize: textVariants.body2.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectedFabrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  fabricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '40',
    borderWidth: 1,
    borderRadius: spacing.borderRadius.m,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  fabricChipText: {
    fontSize: textVariants.body2.fontSize,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  removeChipButton: {
    padding: 2,
  },
});

export default FabricInput; 