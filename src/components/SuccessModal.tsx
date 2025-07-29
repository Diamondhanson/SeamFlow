import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textVariants } from '../theme/textVariants';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  autoCloseDelay?: number; // milliseconds, optional auto-close
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title = 'Success!',
  message = 'Operation completed successfully',
  onClose,
  autoCloseDelay = 3000, // 3 seconds default
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      checkmarkAnim.setValue(0);
      fadeAnim.setValue(0);

      // Start animations sequence
      Animated.sequence([
        // Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Scale in modal
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        // Animate checkmark
        Animated.timing(checkmarkAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close if delay is specified
      if (autoCloseDelay > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [visible, autoCloseDelay]);

  const handleClose = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const checkmarkScale = checkmarkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.3, 1],
  });

  const checkmarkRotate = checkmarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            {/* Success Icon with Animation */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Animated.View
                  style={{
                    transform: [
                      { scale: checkmarkScale },
                      { rotate: checkmarkRotate },
                    ],
                  }}
                >
                  <MaterialIcons 
                    name="check" 
                    size={48} 
                    color={colors.textOnPrimary} 
                  />
                </Animated.View>
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleClose}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.l,
    minWidth: 280,
    maxWidth: 400,
    alignItems: 'center',
    ...themeUtils.getElevation('l'),
  },
  iconContainer: {
    marginBottom: spacing.l,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...themeUtils.getElevation('m'),
  },
  content: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  title: {
    fontSize: textVariants.H4.fontSize,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: textVariants.body1.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    minWidth: 120,
    ...themeUtils.getElevation('s'),
  },
  buttonText: {
    fontSize: textVariants.body1.fontSize,
    fontWeight: '600',
    color: colors.textOnPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

export default SuccessModal; 