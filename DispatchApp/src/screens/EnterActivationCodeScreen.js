import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme/colors';
import { submitActivationCode } from '../licensing/licenseManager';

export default function EnterActivationCodeScreen({ onActivationSuccess, onGoBack }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleActivate = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage('Please enter the activation code provided by the administrator.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await submitActivationCode(trimmed);

      if (result.success) {
        Alert.alert(
          '✅ Device Activated',
          `Welcome!\n\nThis device is now permanently licensed.`,
          [{ text: 'Open App', onPress: () => onActivationSuccess(result.profile) }]
        );
      } else {
        setErrorMessage(result.error || 'Activation failed. Please check the code and try again.');
      }
    } catch {
      setErrorMessage('Unexpected error. Please restart the app and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.brand}>HONDA</Text>
          <Text style={styles.title}>My Shiva Honda</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.card}>
          <Text style={styles.lockIcon}>🔑</Text>
          <Text style={styles.cardTitle}>Enter Activation Code</Text>
          <Text style={styles.cardInfo}>
            Enter the activation code provided by your administrator to unlock this device.
          </Text>

          <Text style={styles.label}>ACTIVATION CODE</Text>
          <TextInput
            style={[styles.input, errorMessage ? styles.inputError : null]}
            placeholder="e.g. MSH-20AF"
            placeholderTextColor="#555"
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              if (errorMessage) setErrorMessage('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleActivate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.buttonText}>ACTIVATE THIS DEVICE</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onGoBack} style={styles.backLink} disabled={loading}>
            <Text style={styles.backLinkText}>← Go back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            🛡️ Each activation code binds permanently to this device only.
            Sharing the code with another phone will NOT work.
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.l },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  brand: { fontSize: 12, color: colors.primary, fontWeight: 'bold', letterSpacing: 6 },
  title: { fontSize: 22, color: colors.white, fontWeight: '900', marginTop: 4 },
  divider: { width: 40, height: 2, backgroundColor: colors.primary, marginTop: spacing.m },
  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: spacing.l,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: spacing.l,
    alignItems: 'center',
  },
  lockIcon: { fontSize: 34, marginBottom: spacing.m },
  cardTitle: { fontSize: 18, color: colors.white, fontWeight: 'bold', marginBottom: spacing.s, textAlign: 'center' },
  cardInfo: { fontSize: 13, color: '#AAAAAA', lineHeight: 20, textAlign: 'center', marginBottom: spacing.l },
  label: { alignSelf: 'flex-start', color: '#777', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 6 },
  input: {
    width: '100%',
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: spacing.m,
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 3,
    fontWeight: 'bold',
    marginBottom: spacing.m,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginBottom: spacing.m, textAlign: 'center', fontWeight: '600' },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  buttonDisabled: { backgroundColor: '#550000' },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  backLink: { paddingVertical: spacing.s },
  backLinkText: { color: '#666', fontSize: 12 },
  hint: {
    backgroundColor: 'rgba(204,0,0,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(204,0,0,0.2)',
    padding: spacing.m,
  },
  hintText: { color: '#A0A0A0', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
