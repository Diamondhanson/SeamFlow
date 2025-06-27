import React, { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import PinEntry from '../screens/PinEntry';
import { useApp } from '../context/AppContext';

interface PinWrapperProps {
  children: React.ReactNode;
}

const PinWrapper: React.FC<PinWrapperProps> = ({ children }) => {
  const { hasPinSet, session } = useApp();
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());
  const [appState, setAppState] = useState(AppState.currentState);

  const PIN_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

  useEffect(() => {
    // Check if PIN is required on component mount
    if (hasPinSet && session) {
      setShowPinEntry(true);
    }
  }, [hasPinSet, session]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming to foreground
        const now = Date.now();
        const timeDiff = now - lastActiveTime;
        
        if (hasPinSet && session && timeDiff > PIN_TIMEOUT) {
          setShowPinEntry(true);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background
        setLastActiveTime(Date.now());
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, lastActiveTime, hasPinSet, session]);

  const handlePinSuccess = () => {
    setShowPinEntry(false);
    setLastActiveTime(Date.now());
  };

  const handleForgotPin = () => {
    // TODO: Implement forgot PIN flow (could navigate to settings or logout)
    console.log('Forgot PIN pressed');
  };

  // Don't show PIN entry if user is not authenticated or PIN is not set
  if (!session || !hasPinSet) {
    return <>{children}</>;
  }

  // Show PIN entry screen if required
  if (showPinEntry) {
    return (
      <PinEntry 
        onSuccess={handlePinSuccess}
        onForgotPin={handleForgotPin}
      />
    );
  }

  return <>{children}</>;
};

export default PinWrapper; 