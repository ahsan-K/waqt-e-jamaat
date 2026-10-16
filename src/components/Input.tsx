import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguage } from '@/i18n/useLanguage';
import { colors } from '@/theme/tokens';
import { fontFamilyFor } from '@/theme/typography';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { Touchable } from './Pressable';

type Props = TextInputProps & { error?: string; secureToggle?: boolean; label?: string };

/** Capsule text field (52pt, radius = height/2) with optional show/hide and error text. */
export function Input({ error, secureToggle, secureTextEntry, style, label, ...rest }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText size={13} weight="bold" color="#3E4A45">
          {label}
        </AppText>
      ) : null}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <TextInput
          placeholderTextColor="#7A847F"
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          accessibilityLabel={rest.accessibilityLabel ?? rest.placeholder}
          {...rest}
          style={[styles.input, { fontFamily: fontFamilyFor(language) }, style]}
        />
        {secureToggle && (
          <Touchable
            onPress={() => setHidden((h) => !h)}
            accessibilityLabel={hidden ? t('auth.showPassword') : t('auth.hidePassword')}
            style={styles.eye}
          >
            <Icon name={hidden ? 'eye' : 'eyeOff'} color={colors.muted} />
          </Touchable>
        )}
      </View>
      {error ? (
        <AppText size={12} weight="semibold" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#DAD6CB',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 12, textAlign: 'auto' },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginEnd: -10 },
});
