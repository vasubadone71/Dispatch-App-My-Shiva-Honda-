import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/colors';

export default function CustomButton({ title, onPress, type = 'primary', style }) {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        type === 'outline' ? styles.outline : styles.primary,
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.text, 
        type === 'outline' ? styles.textOutline : styles.textPrimary
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: spacing.m,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.s,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textPrimary: {
    color: colors.white,
  },
  textOutline: {
    color: colors.primary,
  },
});
