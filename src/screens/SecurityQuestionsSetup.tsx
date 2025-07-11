import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { SECURITY_QUESTIONS } from '../utils/recoveryUtils';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Header from '../components/Header';

interface SecurityQuestionsSetupProps {
  isOnboarding?: boolean;
  onComplete?: () => void;
}

const SecurityQuestionsSetup: React.FC<SecurityQuestionsSetupProps> = ({
  isOnboarding = false,
  onComplete
}) => {
  const navigation = useNavigation();
  const { setupSecurityQuestions } = useApp();
  
  const [selectedQuestion1, setSelectedQuestion1] = useState<string>('');
  const [selectedQuestion2, setSelectedQuestion2] = useState<string>('');
  const [answer1, setAnswer1] = useState<string>('');
  const [answer2, setAnswer2] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showQ1Dropdown, setShowQ1Dropdown] = useState(false);
  const [showQ2Dropdown, setShowQ2Dropdown] = useState(false);

  const handleSetupQuestions = async () => {
    if (!selectedQuestion1 || !selectedQuestion2 || !answer1.trim() || !answer2.trim()) {
      Alert.alert('Error', 'Please complete all fields');
      return;
    }

    if (selectedQuestion1 === selectedQuestion2) {
      Alert.alert('Error', 'Please select different questions');
      return;
    }

    if (answer1.trim().length < 2 || answer2.trim().length < 2) {
      Alert.alert('Error', 'Answers must be at least 2 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await setupSecurityQuestions({
        question1: selectedQuestion1,
        answer1: answer1.trim(),
        question2: selectedQuestion2,
        answer2: answer2.trim(),
      });
      
      Alert.alert(
        'Success',
        'Security questions have been set up successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onComplete) {
                onComplete();
              } else if (isOnboarding) {
                navigation.navigate('Home' as never);
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to set up security questions. Please try again.');
      console.error('Setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Security Questions?',
      'Security questions help you recover your PIN if you forget it. You can set them up later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            if (onComplete) {
              onComplete();
            } else if (isOnboarding) {
              navigation.navigate('Home' as never);
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const getAvailableQuestions = (excludeQuestion?: string) => {
    return SECURITY_QUESTIONS.filter(q => q !== excludeQuestion);
  };

  const renderQuestionSelector = (
    questionNumber: 1 | 2,
    selectedQuestion: string,
    onSelect: (question: string) => void,
    showDropdown: boolean,
    toggleDropdown: () => void
  ) => {
    const excludeQuestion = questionNumber === 1 ? selectedQuestion2 : selectedQuestion1;
    const availableQuestions = getAvailableQuestions(excludeQuestion);

    return (
      <View style={styles.questionContainer}>
        <Text  style={styles.questionLabel}>
          Security Question {questionNumber}
        </Text>
        
        <TouchableOpacity
          style={[styles.dropdownButton, showDropdown && styles.dropdownButtonActive]}
          onPress={toggleDropdown}
        >
          <Text  style={styles.dropdownText}>
            {selectedQuestion || 'Select a question...'}
          </Text>
          <Ionicons
            name={showDropdown ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>

        {showDropdown && (
          <View style={styles.dropdownList}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {availableQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => {
                    onSelect(question);
                    toggleDropdown();
                  }}
                >
                  <Text  style={styles.dropdownItemText}>
                    {question}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerContainer}>
              <Ionicons name="help-circle" size={32} color={colors.primary} />
              <Text  style={styles.title}>
                Choose First Question
              </Text>
              <Text  style={styles.subtitle}>
                Select a question you'll remember the answer to
              </Text>
            </View>

            {renderQuestionSelector(
              1,
              selectedQuestion1,
              setSelectedQuestion1,
              showQ1Dropdown,
              () => setShowQ1Dropdown(!showQ1Dropdown)
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, !selectedQuestion1 && styles.buttonDisabled]}
                disabled={!selectedQuestion1}
                onPress={() => setCurrentStep(2)}
              >
                <Text  style={styles.buttonText}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerContainer}>
              <Ionicons name="help-circle" size={32} color={colors.primary} />
              <Text  style={styles.title}>
                Choose Second Question
              </Text>
              <Text  style={styles.subtitle}>
                Pick a different question for additional security
              </Text>
            </View>

            {renderQuestionSelector(
              2,
              selectedQuestion2,
              setSelectedQuestion2,
              showQ2Dropdown,
              () => setShowQ2Dropdown(!showQ2Dropdown)
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep(1)}
              >
                <Text  style={styles.backButtonText}>
                  Back
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, !selectedQuestion2 && styles.buttonDisabled]}
                disabled={!selectedQuestion2}
                onPress={() => setCurrentStep(3)}
              >
                <Text  style={styles.buttonText}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerContainer}>
              <Ionicons name="key" size={32} color={colors.primary} />
              <Text  style={styles.title}>
                Provide Your Answers
              </Text>
              <Text  style={styles.subtitle}>
                Enter answers you'll remember exactly
              </Text>
            </View>

            <View style={styles.answerContainer}>
              <Text  style={styles.questionText}>
                {selectedQuestion1}
              </Text>
              <TextInput
                style={styles.answerInput}
                value={answer1}
                onChangeText={setAnswer1}
                placeholder="Your answer..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.answerContainer}>
              <Text  style={styles.questionText}>
                {selectedQuestion2}
              </Text>
              <TextInput
                style={styles.answerInput}
                value={answer2}
                onChangeText={setAnswer2}
                placeholder="Your answer..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentStep(2)}
              >
                <Text  style={styles.backButtonText}>
                  Back
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.button,
                  (!answer1.trim() || !answer2.trim()) && styles.buttonDisabled
                ]}
                disabled={!answer1.trim() || !answer2.trim() || isLoading}
                onPress={handleSetupQuestions}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text  style={styles.buttonText}>
                    Complete Setup
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaWrapper>
      <Header 
        title="Security Questions" 
        onBack={() => navigation.goBack()}
      />
      
      {isOnboarding && (
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
        </View>
        <Text  style={styles.progressText}>
          Step {currentStep} of 3
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
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
  questionContainer: {
    marginBottom: 24,
  },
  questionLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  dropdownButtonActive: {
    borderColor: colors.primary,
  },
  dropdownText: {
    flex: 1,
    color: colors.text,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    color: colors.text,
  },
  answerContainer: {
    marginBottom: 24,
  },
  questionText: {
    marginBottom: 8,
    fontWeight: '500',
    color: colors.text,
  },
  answerInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: colors.textSecondary,
  },
});

export default SecurityQuestionsSetup; 