import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { SecurityProvider } from './src/security/SecurityProvider';
import Router from './src/navigation/Router';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SecurityProvider>
          <ErrorBoundary>
            <NavigationContainer>
              <Router />
            </NavigationContainer>
          </ErrorBoundary>
        </SecurityProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
