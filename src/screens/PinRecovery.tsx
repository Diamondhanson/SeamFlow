import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';


type RecoveryMethod = 'password' | 'security_questions';

const PinRecovery: React.FC = () => {
  const navigation = useNavigation();
  const { 
    user,
    hasSecurityQuestions,
    getSecurityQuestions,
    resetPinWithPassword,
    resetPinWithSecurityQuestions,
  } = useApp();
  
  const [selectedMethod, setSelectedMethod] = useState<RecoveryMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password recovery
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  
  // Security questions recovery
  const [securityQuestions, setSecurityQuestions] = useState<{
    question1: string;
    question2: string;
  } | null>(null);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');

  useEffect(() => {
    if (hasSecurityQuestions) {
      loadSecurityQuestions();
    }
  }, [hasSecurityQuestions]);

  const loadSecurityQuestions = async () => {
    try {
      const questions = await getSecurityQuestions();
      setSecurityQuestions(questions);
    } catch (error) {
      console.error('Error loading security questions:', error);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await resetPinWithPassword(email.trim(), password);
      
      Alert.alert(
        'PIN Reset Successfully',
        'Your PIN has been removed. You can now access the app normally and set up a new PIN if desired.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home' as never),
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset PIN';
      Alert.alert('Recovery Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityQuestionsRecovery = async () => {
    if (!answer1.trim() || !answer2.trim()) {
      Alert.alert('Error', 'Please answer both security questions');
      return;
    }

    setIsLoading(true);
    try {
      await resetPinWithSecurityQuestions(answer1.trim(), answer2.trim());
      
      Alert.alert(
        'PIN Reset Successfully',
        'Your PIN has been removed. You can now access the app normally and set up a new PIN if desired.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home' as never),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Recovery Failed', 'The security question answers provided are incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text variant="headingSmall" style={styles.headerTitle}>
          PIN Recovery
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Ionicons name="lock-open" size={32} color={colors.primary} />
            <Text variant="headingMedium" style={styles.title}>
              Reset Your PIN
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Choose a recovery method to reset your PIN
            </Text>
          </View>

          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setSelectedMethod('password')}
          >
            <View style={styles.methodIconContainer}>
              <Ionicons name="mail" size={24} color={colors.primary} />
            </View>
            <View style={styles.methodContent}>
              <Text variant="bodyLarge" style={styles.methodTitle}>
                Email & Password
              </Text>
              <Text variant="bodyMedium" style={styles.methodDescription}>
                Verify your account credentials to reset PIN
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {hasSecurityQuestions && (
            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setSelectedMethod('security_questions')}
            >
              <View style={styles.methodIconContainer}>
                <Ionicons name="help-circle" size={24} color={colors.warning} />
              </View>
              <View style={styles.methodContent}>
                <Text variant="bodyLarge" style={styles.methodTitle}>
                  Security Questions
                </Text>
                <Text variant="bodyMedium" style={styles.methodDescription}>
                  Answer your security questions to reset PIN
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDescription: {
    color: colors.textSecondary,
  },
});

export default PinRecovery; 