import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  useEffect,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme/colors';

export default function VerificationPendingScreen({ dealerProfile, onNavigateToCode, onResetRequest }) {
  // Animated pulsing dot
  const [pulseAnim] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.brandTitle}>HONDA</Text>
        <Text style={styles.dmsTitle}>My Shiva Honda</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.body}>
        <Animated.View style={[styles.iconBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.icon}>📡</Text>
        </Animated.View>

        <Text style={styles.title}>Verification Pending</Text>
        <Text style={styles.description}>
          Your activation request has been successfully dispatched to the Badone Motors IT Desk via Telegram Bot.
        </Text>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsHeader}>WHAT HAPPENS NEXT?</Text>

          <View style={styles.step}>
            <Text style={styles.stepNum}>1</Text>
            <Text style={styles.stepText}>Administrator reviews your dealer profile</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>2</Text>
            <Text style={styles.stepText}>Activation code is generated and sent to you</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>3</Text>
            <Text style={styles.stepText}>Enter the code below to permanently activate this device</Text>
          </View>
        </View>

        {dealerProfile && (
          <View style={styles.profilePill}>
            <Text style={styles.profileLabel}>PENDING REQUEST</Text>
            <Text style={styles.profileName}>{dealerProfile.name}</Text>
            <Text style={styles.profileSub}>{dealerProfile.owner} · {dealerProfile.city}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onNavigateToCode}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>I HAVE AN ACTIVATION CODE →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={onResetRequest}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>Cancel & Re-submit Request</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: spacing.l,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  brandTitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 6,
  },
  dmsTitle: {
    fontSize: 22,
    color: colors.white,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    marginTop: spacing.m,
  },
  body: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(204,0,0,0.1)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 22,
    color: colors.white,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  description: {
    fontSize: 13,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.l,
  },
  stepsCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    padding: spacing.m,
    width: '100%',
    borderWidth: 1,
    borderColor: '#282828',
    marginBottom: spacing.m,
  },
  stepsHeader: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: spacing.m,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.s,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 22,
    marginRight: spacing.s,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#D0D0D0',
    lineHeight: 20,
  },
  profilePill: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: spacing.l,
  },
  profileLabel: {
    color: '#555',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  profileName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  profileSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  resetButton: {
    paddingVertical: spacing.s,
  },
  resetButtonText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.m,
  },
  footerLabel: {
    color: '#444',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  footerSub: {
    color: '#333',
    fontSize: 10,
    marginTop: 2,
  },
});
