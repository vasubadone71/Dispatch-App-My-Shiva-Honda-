import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme/colors';
import { checkLicenseState, resetActivation, LICENSE_STATUS } from '../licensing/licenseService';

export default function LockScreen({ lockStatus, lockError, dealerProfile, onResetState, onUnlockSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const state = await checkLicenseState();
      if (state.status === LICENSE_STATUS.VALID) {
        Alert.alert(
          'Verification Success',
          'License authenticated successfully! Operations restored.',
          [{ text: 'Continue', onPress: () => onUnlockSuccess(state.profile) }]
        );
      } else {
        Alert.alert(
          'Verification Failed',
          state.error || 'Dynamic verification was unsuccessful. Please check connection and try again.'
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to complete online verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Activation',
      'Are you sure you want to de-register this device? This will clear local keys and prompt for a new license activation key.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Reset', 
          style: 'destructive',
          onPress: async () => {
            await resetActivation();
            onResetState();
          } 
        }
      ]
    );
  };

  const getHeaderTitle = () => {
    switch (lockStatus) {
      case LICENSE_STATUS.UNAUTHORIZED_DEVICE:
        return 'UNAUTHORIZED DEVICE';
      case LICENSE_STATUS.EXPIRED:
        return 'LICENSE EXPIRED';
      case LICENSE_STATUS.VERIFICATION_OVERDUE:
        return 'VERIFICATION OVERDUE';
      case LICENSE_STATUS.REVOKED:
        return 'ACCESS REVOKED';
      default:
        return 'SOFTWARE LOCK';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
        <Text style={styles.brandTitle}>HONDA</Text>
        <Text style={styles.lockTitle}>{getHeaderTitle()}</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.content}>
        <Text style={styles.errorMessage}>
          {lockError || 'Access to this system has been suspended. Please check your credentials or contact your administrator.'}
        </Text>

        {dealerProfile && (
          <View style={styles.dealerBox}>
            <Text style={styles.dealerLabel}>REGISTERED DEALERSHIP</Text>
            <Text style={styles.dealerValue}>{dealerProfile.name}</Text>
            <Text style={styles.dealerLoc}>{dealerProfile.location}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
          onPress={handleRetry}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>RETRY LICENSE VERIFICATION</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>DE-REGISTER & ACTIVATE NEW KEY</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.supportHeader}>TECHNICAL SUPPORT HELP DESK</Text>
        <Text style={styles.supportCompany}>Badone Motors Private Limited</Text>
        <Text style={styles.supportContact}>Biaora, Rajgarh, Madhya Pradesh, India</Text>
        <Text style={styles.supportWarning}>IP and hardware credentials have been logged for compliance.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    padding: spacing.l,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl * 1.5,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(204, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: spacing.l,
  },
  lockIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginBottom: spacing.s / 2,
  },
  lockTitle: {
    fontSize: 24,
    color: colors.white,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    marginTop: spacing.m,
  },
  content: {
    alignItems: 'stretch',
    paddingHorizontal: spacing.s,
  },
  errorMessage: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.m,
  },
  dealerBox: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 8,
    padding: spacing.m,
    marginBottom: spacing.xl,
  },
  dealerLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#707070',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  dealerValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
  dealerLoc: {
    fontSize: 12,
    color: '#909090',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  buttonDisabled: {
    backgroundColor: '#500000',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  supportHeader: {
    color: '#444444',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  supportCompany: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '700',
  },
  supportContact: {
    color: '#707070',
    fontSize: 11,
    marginTop: 2,
  },
  supportWarning: {
    color: '#3A3A3A',
    fontSize: 10,
    marginTop: spacing.s,
    textAlign: 'center',
  },
});
