import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme/colors';
import { checkLicenseState, resetActivation, LICENSE_STATUS } from '../licensing/licenseService';

export default function LicenseExpiredScreen({ errorMessage, dealerProfile, onUnlockSuccess, onReset }) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const state = await checkLicenseState();
      if (state.status === LICENSE_STATUS.VALID) {
        Alert.alert('Verification Successful', 'License verified. Access restored.', [
          { text: 'Continue', onPress: () => onUnlockSuccess(state.profile) },
        ]);
      } else {
        Alert.alert('Verification Failed', state.error || 'Online verification was unsuccessful.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach the verification server.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset License',
      'Clear all license data and re-activate with a new code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
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
          <Text style={styles.icon}>⏱️</Text>
        </View>
        <Text style={styles.brand}>HONDA</Text>
        <Text style={styles.title}>LICENSE EXPIRED</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.body}>
        <Text style={styles.message}>
          {errorMessage || 'Your software license has expired or online verification is overdue. The application is locked to protect business data.'}
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📶  Connect to the internet and tap "Retry" below to verify your license online.
            Your business data (dispatches, masters) remains safely stored and is NOT deleted.
          </Text>
        </View>

        {dealerProfile && (
          <View style={styles.dealerBox}>
            <Text style={styles.dealerLabel}>DEALER</Text>
            <Text style={styles.dealerName}>{dealerProfile.name}</Text>
            {(dealerProfile.location || dealerProfile.city) && (
              <Text style={styles.dealerSub}>{dealerProfile.location || dealerProfile.city}</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleRetry}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={styles.primaryButtonText}>RETRY LICENSE VERIFICATION</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleReset} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>RESET & ACTIVATE NEW KEY</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>BADONE MOTORS PRIVATE LIMITED</Text>
        <Text style={styles.footerSub}>Biaora, Rajgarh, Madhya Pradesh</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E', padding: spacing.l, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: spacing.xl * 1.5 },
  iconBadge: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,187,51,0.08)',
    borderWidth: 1.5, borderColor: colors.warning,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.l,
  },
  icon: { fontSize: 28 },
  brand: { fontSize: 11, color: colors.warning, fontWeight: 'bold', letterSpacing: 6 },
  title: { fontSize: 22, color: colors.white, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  divider: { width: 40, height: 2, backgroundColor: colors.warning, marginTop: spacing.m },
  body: { alignItems: 'stretch', paddingHorizontal: spacing.s },
  message: { fontSize: 14, color: '#D0D0D0', textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  infoBox: {
    backgroundColor: 'rgba(0,200,81,0.05)', borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(0,200,81,0.15)', padding: spacing.m, marginBottom: spacing.l,
  },
  infoText: { color: '#88CC88', fontSize: 12, lineHeight: 18 },
  dealerBox: {
    backgroundColor: '#151515', borderRadius: 8, paddingHorizontal: spacing.m, paddingVertical: spacing.s,
    borderLeftWidth: 3, borderLeftColor: colors.warning, marginBottom: spacing.l,
  },
  dealerLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5 },
  dealerName: { color: colors.white, fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  dealerSub: { color: '#777', fontSize: 12, marginTop: 1 },
  primaryButton: {
    backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginBottom: spacing.m,
  },
  buttonDisabled: { backgroundColor: '#550000' },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  secondaryButton: {
    borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  secondaryButtonText: { color: '#777', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  footer: { alignItems: 'center', marginBottom: spacing.m },
  footerLabel: { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5 },
  footerSub: { color: '#333', fontSize: 10, marginTop: 2 },
});
