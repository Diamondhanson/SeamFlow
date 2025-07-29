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
import { themeUtils } from '../theme';

interface ColorPickerProps {
  selectedColors: string[];
  onColorsChange: (colors: string[]) => void;
  label?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColors,
  onColorsChange,
  label = 'Colors',
}) => {
  const [colorInput, setColorInput] = useState('');

  const handleAddColor = () => {
    const color = colorInput.trim();
    if (!color) {
      Alert.alert('Invalid Input', 'Please enter a color name');
      return;
    }

    // Check if color already exists (case insensitive)
    const exists = selectedColors.some(c => c.toLowerCase() === color.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Color', 'This color is already added');
      return;
    }

    onColorsChange([...selectedColors, color]);
    setColorInput('');
  };

  const removeColor = (colorToRemove: string) => {
    onColorsChange(selectedColors.filter(c => c !== colorToRemove));
  };

  const clearAllColors = () => {
    Alert.alert(
      'Clear All Colors',
      'Are you sure you want to remove all selected colors?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => onColorsChange([]) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {selectedColors.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearAllColors}
          >
            <MaterialIcons name="clear-all" size={18} color={colors.error} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Color Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.colorInput}
          placeholder="Enter color name (e.g., Red, Navy Blue, etc.)"
          value={colorInput}
          onChangeText={setColorInput}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleAddColor}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddColor}
        >
          <MaterialIcons name="add" size={20} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Selected Colors */}
      {selectedColors.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>Selected Colors ({selectedColors.length}):</Text>
          <View style={styles.selectedColors}>
            {selectedColors.map((color, index) => (
              <View key={index} style={styles.colorChip}>
                <Text style={styles.colorChipText}>{color}</Text>
                <TouchableOpacity
                  style={styles.removeChipButton}
                  onPress={() => removeColor(color)}
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
  colorInput: {
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
  selectedColors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  colorChip: {
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
  colorChipText: {
    fontSize: textVariants.body2.fontSize,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  removeChipButton: {
    padding: 2,
  },
});

export default ColorPicker; 