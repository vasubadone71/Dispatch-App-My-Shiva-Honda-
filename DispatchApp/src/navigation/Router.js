import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { useSecurity } from '../security/SecurityProvider';
import { LICENSE_STATUS } from '../licensing/licenseManager';
import { colors } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import NetworkMasterScreen from '../screens/NetworkMasterScreen';
import ModelMasterScreen from '../screens/ModelMasterScreen';
import ColorMasterScreen from '../screens/ColorMasterScreen';
import NewDispatchScreen from '../screens/NewDispatchScreen';
import HistoryScreen from '../screens/HistoryScreen';

import ActivationScreen from '../screens/ActivationScreen';
import EnterActivationCodeScreen from '../screens/EnterActivationCodeScreen';
import UnauthorizedDeviceScreen from '../screens/UnauthorizedDeviceScreen';

const Stack = createNativeStackNavigator();

export default function Router() {
  const { 
    appState, 
    lockError, 
    dealerProfile,
    handleNavigateToCode,
    handleGoBack,
    handleReset,
    handleActivated
  } = useSecurity();

  if (appState === LICENSE_STATUS.LOADING) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <View style={styles.splashRedBar} />
        <Text style={styles.splashBrand}>HONDA</Text>
        <Text style={styles.splashTitle}>My Shiva Honda</Text>
        <Text style={styles.splashSub}>Checking device authorization…</Text>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        <Text style={styles.splashFooter}>Badone Motors Private Limited</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {appState === LICENSE_STATUS.VALID ? (
        // Main App Flow
        <Stack.Group>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen name="NetworkMaster" component={NetworkMasterScreen} options={{ title: 'Network Master' }} />
          <Stack.Screen name="ModelMaster" component={ModelMasterScreen} options={{ title: 'Model Master' }} />
          <Stack.Screen name="ColorMaster" component={ColorMasterScreen} options={{ title: 'Color Master' }} />
          <Stack.Screen name="NewDispatch" component={NewDispatchScreen} options={{ title: 'New Dispatch' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Dispatch History' }} />
        </Stack.Group>
      ) : (
        // Authentication / Security Flow
        <Stack.Group screenOptions={{ headerShown: false, animation: 'fade' }}>
          {appState === LICENSE_STATUS.UNLICENSED && (
            <Stack.Screen name="Activation">
              {() => <ActivationScreen onNavigateToCode={handleNavigateToCode} />}
            </Stack.Screen>
          )}
          {appState === LICENSE_STATUS.PENDING_CODE && (
            <Stack.Screen name="EnterCode">
              {() => <EnterActivationCodeScreen onActivationSuccess={handleActivated} onGoBack={handleGoBack} />}
            </Stack.Screen>
          )}
          {appState === LICENSE_STATUS.UNAUTHORIZED_DEVICE && (
            <Stack.Screen name="Unauthorized">
              {() => <UnauthorizedDeviceScreen errorMessage={lockError} dealerProfile={dealerProfile} onReset={handleReset} />}
            </Stack.Screen>
          )}
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#111111',
    alignItems: 'center', justifyContent: 'center',
  },
  splashRedBar: {
    width: 50, height: 3, backgroundColor: colors.primary,
    borderRadius: 2, marginBottom: 16,
  },
  splashBrand: {
    fontSize: 12, color: colors.primary,
    fontWeight: 'bold', letterSpacing: 7,
  },
  splashTitle: {
    fontSize: 26, color: '#fff',
    fontWeight: '900', letterSpacing: 1.5, marginTop: 6,
  },
  splashSub: { fontSize: 12, color: '#888', marginTop: 6 },
  splashFooter: {
    position: 'absolute', bottom: 40,
    fontSize: 10, color: '#444',
    fontWeight: 'bold', letterSpacing: 0.5,
  },
});
