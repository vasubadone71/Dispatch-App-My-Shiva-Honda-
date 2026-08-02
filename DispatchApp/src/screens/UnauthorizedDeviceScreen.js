import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme/colors';
import { resetActivation } from '../licensing/licenseService';

export default function UnauthorizedDeviceScreen({ errorMessage, dealerProfile, onReset }) {
  const handleReset = () => {
    Alert.alert(
      'Reset Activation',
      'This will clear all license data on this device. You will need a new activation code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Reset',
          style: 'destructive',
          onPress: async () => {
            await resetActivation();
            onReset();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Text style={styles.icon}>🚫</Text>
        </View>
        <Text style={styles.brand}>HONDA</Text>
        <Text style={styles.title}>UNAUTHORIZED DEVICE</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.body}>
        <Text style={styles.message}>
          {errorMessage || 'This device is not authorized. The active license key is registered to another mobile device.'}
        </Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Each license key is permanently bound to a single physical device. Copying the APK to another phone will not transfer the license.
          </Text>
        </View>

        {dealerProfile && (
          <View style={styles.dealerBox}>
            <Text style={styles.dealerLabel}>REGISTERED TO</Text>
            <Text style={styles.dealerName}>{dealerProfile.name}</Text>
            {dealerProfile.city && <Text style={styles.dealerSub}>{dealerProfile.city}</Text>}
          </View>
        )}

        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
          <Text style={styles.resetButtonText}>RESET & RE-ACTIVATE</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>TECHNICAL SUPPORT</Text>
        <Text style={styles.footerCompany}>Badone Motors Private Limited</Text>
        <Text style={styles.footerLocation}>Biaora, Rajgarh, Madhya Pradesh</Text>
        <Text style={styles.footerWarn}>Device credentials have been logged.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', padding: spacing.l, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: spacing.xl * 1.5 },
  iconBadge: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderWidth: 1.5, borderColor: colors.danger,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.l,
  },
  icon: { fontSize: 30 },
  brand: { fontSize: 11, color: colors.danger, fontWeight: 'bold', letterSpacing: 6 },
  title: { fontSize: 22, color: colors.white, fontWeight: '900', letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  divider: { width: 40, height: 2, backgroundColor: colors.danger, marginTop: spacing.m },
  body: { alignItems: 'center', paddingHorizontal: spacing.s },
  message: { fontSize: 14, color: '#D0D0D0', textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  warningBox: {
    backgroundColor: 'rgba(255,187,51,0.06)', borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(255,187,51,0.2)', padding: spacing.m,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.l, width: '100%',
  },
  warningIcon: { fontSize: 18, marginRight: spacing.s, marginTop: 1 },
  warningText: { flex: 1, color: '#CCAA55', fontSize: 12, lineHeight: 18 },
  dealerBox: {
    backgroundColor: '#151515', borderRadius: 8, paddingHorizontal: spacing.m, paddingVertical: spacing.s,
    width: '100%', borderLeftWidth: 3, borderLeftColor: colors.danger, marginBottom: spacing.l,
  },
  dealerLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5 },
  dealerName: { color: colors.white, fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  dealerSub: { color: '#777', fontSize: 12, marginTop: 1 },
  resetButton: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333', borderRadius: 8,
    paddingVertical: 12, width: '100%', alignItems: 'center',
  },
  resetButtonText: { color: '#888', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  footer: { alignItems: 'center', marginBottom: spacing.m },
  footerLabel: { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5 },
  footerCompany: { color: '#888', fontSize: 11, fontWeight: '700', marginTop: 2 },
  footerLocation: { color: '#555', fontSize: 10, marginTop: 1 },
  footerWarn: { color: '#2A2A2A', fontSize: 9, marginTop: spacing.s },
});
