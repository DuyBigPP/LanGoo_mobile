const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    // Cho phép bundle model ONNX + bộ nhãn chữ Hán như asset (require trong src/lib/kanji-ink.ts)
    assetExts: [...getDefaultConfig(__dirname).resolver.assetExts, "onnx", "txt"],
  },
});

// withNativeWind: biên dịch global.css (Tailwind) cho NativeWind
// inlineRem 16: Reusables giả định 1rem = 16px (NativeWind mặc định 14) — giữ cỡ chữ chuẩn
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
