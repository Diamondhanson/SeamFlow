import * as Crypto from 'expo-crypto';

/**
 * Hash a PIN using SHA-256 with a salt
 */
export const hashPin = async (pin: string): Promise<string> => {
  const salt = 'seamflow_pin_salt_2024'; // App-specific salt
  const combined = pin + salt;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return hash;
};

/**
 * Validate a PIN against its hash
 */
export const validatePin = async (pin: string, hash: string): Promise<boolean> => {
  const pinHash = await hashPin(pin);
  return pinHash === hash;
};

/**
 * Validate PIN format (4 digits)
 */
export const isValidPinFormat = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
}; 