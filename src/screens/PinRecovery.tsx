import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Text
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { themeUtils } from '../theme';
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
        'Your PIN has been removed. You can now set up a new PIN.',
        [
          {
            text: 'Set New PIN',
            onPress: () => navigation.navigate('PinSetup' as never),
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
        'Your PIN has been removed. You can now set up a new PIN.',
        [
          {
            text: 'Set New PIN',
            onPress: () => navigation.navigate('PinSetup' as never),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Recovery Failed', 'The security question answers provided are incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.methodContainer}>
      <View style={styles.headerContainer}>
        <Ionicons name="lock-open" size={32} color={colors.primary} />
        <Text style={styles.title}>
          Reset Your PIN
        </Text>
        <Text style={styles.subtitle}>
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
          <Text style={styles.methodTitle}>
            Email & Password
          </Text>
          <Text style={styles.methodDescription}>
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
            <Text style={styles.methodTitle}>
              Security Questions
            </Text>
            <Text style={styles.methodDescription}>
              Answer your security questions to reset PIN
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPasswordForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.headerContainer}>
        <Ionicons name="mail" size={32} color={colors.primary} />
        <Text style={styles.title}>
          Email & Password Recovery
        </Text>
        <Text style={styles.subtitle}>
          Enter your account credentials to reset your PIN
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          autoComplete="password"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handlePasswordRecovery}
        disabled={isLoading || !email.trim() || !password.trim()}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.submitButtonText}>Reset PIN</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backToMethodsButton}
        onPress={() => setSelectedMethod(null)}
      >
        <Text style={styles.backToMethodsText}>Choose Different Method</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSecurityQuestionsForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.headerContainer}>
        <Ionicons name="help-circle" size={32} color={colors.warning} />
        <Text style={styles.title}>
          Security Questions Recovery
        </Text>
        <Text style={styles.subtitle}>
          Answer your security questions to reset your PIN
        </Text>
      </View>

      {securityQuestions && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{securityQuestions.question1}</Text>
            <TextInput
              style={styles.input}
              value={answer1}
              onChangeText={setAnswer1}
              placeholder="Enter your answer"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{securityQuestions.question2}</Text>
            <TextInput
              style={styles.input}
              value={answer2}
              onChangeText={setAnswer2}
              placeholder="Enter your answer"
              autoCapitalize="none"
            />
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSecurityQuestionsRecovery}
        disabled={isLoading || !answer1.trim() || !answer2.trim()}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.submitButtonText}>Reset PIN</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backToMethodsButton}
        onPress={() => setSelectedMethod(null)}
      >
        <Text style={styles.backToMethodsText}>Choose Different Method</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (selectedMethod) {
      case 'password':
        return renderPasswordForm();
      case 'security_questions':
        return renderSecurityQuestionsForm();
      default:
        return renderMethodSelection();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => {
            if (selectedMethod) {
              setSelectedMethod(null);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          PIN Recovery
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  backIcon: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.l + spacing.xs, // Balance the back button space
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.m,
  },
  methodContainer: {
    paddingVertical: spacing.l,
  },
  formContainer: {
    paddingVertical: spacing.l,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.l,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...themeUtils.getElevation('xs'),
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  methodDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.l,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.s,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: spacing.borderRadius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    fontSize: 16,
    color: colors.text,
    ...themeUtils.getElevation('xs'),
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginTop: spacing.l,
    ...themeUtils.getElevation('s'),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  backToMethodsButton: {
    alignItems: 'center',
    marginTop: spacing.l,
    paddingVertical: spacing.s,
  },
  backToMethodsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default PinRecovery; 