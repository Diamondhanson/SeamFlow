import React, { useState } from 'react';
import {
  View,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  selectedDate: Date;
  mode?: 'date' | 'time';
}

const DatePicker: React.FC<DatePickerProps> = ({
  visible,
  onClose,
  onDateChange,
  selectedDate,
  mode = 'date',
}) => {
  const [tempDate, setTempDate] = useState<Date>(selectedDate);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      onClose();
      if (event.type === 'set' && date) {
        onDateChange(date);
      }
    } else {
      if (date) {
        setTempDate(date);
      }
    }
  };

  const handleConfirm = () => {
    onDateChange(tempDate);
    onClose();
  };

  if (Platform.OS === 'android') {
    if (visible) {
      return (
        <DateTimePicker
          value={selectedDate}
          mode={mode}
          display="default"
          onChange={handleDateChange}
        />
      );
    }
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.pickerContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmButton}>Confirm</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode={mode}
            display="spinner"
            onChange={handleDateChange}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default DatePicker;
