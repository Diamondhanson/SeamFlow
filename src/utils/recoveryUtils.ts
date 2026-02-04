import * as Crypto from 'expo-crypto';
import { supabase } from '@/supabaseConfig';

/**
 * Hash security answer using SHA-256 with a salt
 */
export const hashSecurityAnswer = async (answer: string): Promise<string> => {
  const salt = 'seamflow_security_salt_2024';
  const normalizedAnswer = answer.toLowerCase().trim();
  const combined = normalizedAnswer + salt;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return hash;
};

/**
 * Validate security answer against its hash
 */
export const validateSecurityAnswer = async (answer: string, hash: string): Promise<boolean> => {
  const answerHash = await hashSecurityAnswer(answer);
  return answerHash === hash;
};

/**
 * Log recovery attempt for audit trail
 */
export const logRecoveryAttempt = async (
  userId: string,
  recoveryType: 'pin_reset' | 'password_reset' | 'security_questions',
  recoveryMethod: 'email_password' | 'security_questions' | 'email_reset',
  success: boolean,
  failureReason?: string
) => {
  try {
    const { error } = await supabase
      .from('recovery_audit_log')
      .insert({
        user_id: userId,
        recovery_type: recoveryType,
        recovery_method: recoveryMethod,
        success,
        failure_reason: failureReason || null
      });

    if (error) {
      console.error('Error logging recovery attempt:', error);
    }
  } catch (error) {
    console.error('Error in logRecoveryAttempt:', error);
  }
};

/**
 * Track PIN attempt failures and implement lockout
 */
export const trackPinAttempt = async (userId: string, success: boolean) => {
  try {
    if (success) {
      // Reset failed attempts on success
      const { error } = await supabase
        .from('pin_attempt_tracking')
        .upsert(
          {
            user_id: userId,
            failed_attempts: 0,
            locked_until: null,
            last_attempt: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      
      if (error) throw error;
      return { locked: false, attemptsRemaining: 5 };
    } else {
      // Increment failed attempts
      const { data: existing } = await supabase
        .from('pin_attempt_tracking')
        .select('*')
        .eq('user_id', userId)
        .single();

      const currentAttempts = existing?.failed_attempts || 0;
      const newAttempts = currentAttempts + 1;
      const maxAttempts = 5;
      
      let lockedUntil = null;
      if (newAttempts >= maxAttempts) {
        // Lock for 1 hour after 5 failed attempts
        const lockDuration = 60 * 60 * 1000; // 1 hour in milliseconds
        lockedUntil = new Date(Date.now() + lockDuration).toISOString();
      }

      const { error } = await supabase
        .from('pin_attempt_tracking')
        .upsert(
          {
            user_id: userId,
            failed_attempts: newAttempts,
            locked_until: lockedUntil,
            last_attempt: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      return {
        locked: !!lockedUntil,
        attemptsRemaining: Math.max(0, maxAttempts - newAttempts),
        lockedUntil
      };
    }
  } catch (error) {
    console.error('Error tracking PIN attempt:', error);
    return { locked: false, attemptsRemaining: 5 };
  }
};

/**
 * Check if user is currently locked out
 */
export const checkPinLockout = async (userId: string) => {
  try {
    const { data } = await supabase
      .from('pin_attempt_tracking')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return { locked: false, attemptsRemaining: 5 };

    const now = new Date();
    const lockedUntil = data.locked_until ? new Date(data.locked_until) : null;

    if (lockedUntil && now < lockedUntil) {
      return {
        locked: true,
        lockedUntil,
        attemptsRemaining: 0
      };
    }

    // If lock has expired, reset attempts
    if (lockedUntil && now >= lockedUntil) {
      await supabase
        .from('pin_attempt_tracking')
        .update({
          failed_attempts: 0,
          locked_until: null
        })
        .eq('user_id', userId);

      return { locked: false, attemptsRemaining: 5 };
    }

    return {
      locked: false,
      attemptsRemaining: Math.max(0, 5 - (data.failed_attempts || 0))
    };
  } catch (error) {
    console.error('Error checking PIN lockout:', error);
    return { locked: false, attemptsRemaining: 5 };
  }
};

/**
 * Predefined security questions
 */
export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is the name of the city where you were born?",
  "What was your favorite food as a child?",
  "What was the model of your first car?",
  "What is your favorite movie?",
  "What was the name of your best friend in childhood?",
  "What is your favorite book?",
  "What was your first job?"
]; 