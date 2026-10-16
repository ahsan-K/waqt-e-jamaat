import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useLanguage } from '@/i18n/useLanguage';
import { colors, type ColorName } from '@/theme/tokens';
import {
  fontFamily,
  lineHeightFor,
  scriptFor,
  type FontWeight,
  type Script,
} from '@/theme/typography';

export type AppTextProps = TextProps & {
  size?: number;
  weight?: FontWeight;
  color?: ColorName | (string & {});
  /** Force a script regardless of UI language (e.g. Latin brand name, Urdu masjid name). */
  script?: Script;
  align?: TextStyle['textAlign'];
};

/** Single text primitive: picks Manrope / Noto Nastaliq Urdu and line height from the language. */
export function AppText({
  size = 15,
  weight = 'medium',
  color = 'ink',
  script,
  align,
  style,
  ...rest
}: AppTextProps) {
  const { language } = useLanguage();
  const resolvedScript = script ?? scriptFor(language);
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? size;
  const resolvedColor = color in colors ? colors[color as ColorName] : color;

  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        {
          fontSize,
          lineHeight: lineHeightFor(resolvedScript, fontSize),
          color: resolvedColor,
          textAlign: align,
          // Only force RTL paragraphs when the whole UI is Urdu; an Urdu name inside an LTR UI keeps start alignment.
          writingDirection: language === 'ur' ? 'rtl' : undefined,
        },
        style,
        // Custom fonts select weight via family; fontWeight would make Android fall back.
        { fontFamily: fontFamily(resolvedScript, weight), fontWeight: undefined },
      ]}
    />
  );
}
