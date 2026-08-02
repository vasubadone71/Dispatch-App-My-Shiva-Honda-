import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme/colors';
import { getDeviceFingerprintData } from '../security/deviceVerification';
import { getShortDeviceId } from '../licensing/licenseManager';

export default function ActivationScreen({ onNavigateToCode }) {
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    async function loadDeviceData() {
      try {
        const deviceData = await getDeviceFingerprintData();
        const shortId = getShortDeviceId(deviceData.deviceHash);
        setDeviceId(shortId);
      } catch (err) {
        console.error('Failed to get device ID', err);
        setDeviceId('ERROR-LOADING');
      } finally {
        setLoading(false);
      }
    }
    loadDeviceData();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.redBar} />
          <Text style={styles.brandTag}>HONDA</Text>
          <Text style={styles.appName}>My Shiva Honda</Text>
          <Text style={styles.appSub}>Dealership Management System</Text>
          <View style={styles.redBar} />
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🔐</Text>
          <Text style={styles.cardTitle}>Device Activation Required</Text>
          <Text style={styles.cardDesc}>
            This software requires authorization. Please contact your administrator and provide the following Device ID to receive an activation code.
          </Text>

          <View style={styles.deviceIdContainer}>
            <Text style={styles.deviceIdLabel}>YOUR DEVICE ID</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.deviceIdValue}>{deviceId}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onNavigateToCode}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>I HAVE AN ACTIVATION CODE</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerCo}>BADONE MOTORS PRIVATE LIMITED</Text>
          <Text style={styles.footerLoc}>Biaora, Rajgarh, Madhya Pradesh · Authorized Honda Dealer</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#111111' },
  scroll: { flexGrow: 1, padding: spacing.l, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  redBar: { width: 50, height: 3, backgroundColor: colors.primary, borderRadius: 2 },
  brandTag: { color: colors.primary, fontSize: 11, fontWeight: 'bold', letterSpacing: 7, marginVertical: 8 },
  appName:  { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  appSub:   { color: '#888', fontSize: 11, marginTop: 4, letterSpacing: 0.5 },

  card: {
    backgroundColor: '#1C1C1C', borderRadius: 14, padding: spacing.l,
    borderWidth: 1, borderColor: '#2A2A2A',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
    marginBottom: spacing.l,
  },
  cardIcon:  { fontSize: 32, textAlign: 'center', marginBottom: spacing.s },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: spacing.s },
  cardDesc:  { color: '#999', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: spacing.l },

  deviceIdContainer: {
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: spacing.m,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  deviceIdLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  deviceIdValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
  },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText:  { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },

  footer:    { alignItems: 'center', marginTop: spacing.l },
  footerCo:  { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5 },
  footerLoc: { color: '#333', fontSize: 9, marginTop: 3 },
});
