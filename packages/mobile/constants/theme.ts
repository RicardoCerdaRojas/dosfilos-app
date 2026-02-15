/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const primary = '#1754cf';
const backgroundLight = '#f6f6f8';
const backgroundDark = '#111621';
const academicGold = '#c5a059';
const academicBeige = '#f5f5dc';

export const Colors = {
  light: {
    text: '#0f172a', // Slate 900 equivalent
    background: backgroundLight,
    tint: primary,
    icon: '#64748b', // Slate 500
    tabIconDefault: '#64748b',
    tabIconSelected: primary,
    academicGold,
    academicBeige,
  },
  dark: {
    text: '#f8fafc', // Slate 50 equivalent
    background: backgroundDark,
    tint: primary, // Using primary for consistency
    icon: '#94a3b8', // Slate 400
    tabIconDefault: '#94a3b8',
    tabIconSelected: primary,
    academicGold,
    academicBeige,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
