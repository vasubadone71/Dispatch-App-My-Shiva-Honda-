import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/colors';

export default function InputField({ label, value, onChangeText, placeholder, keyboardType = 'default', style }) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.m,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.s / 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
});
