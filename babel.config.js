module.exports = function (api) {
  // api.cache(false): đọc lại .env mỗi lần Babel chạy (đổi .env thì khởi động lại Metro kèm --reset-cache)
  api.cache(false);
  return {
    presets: [
      "module:@react-native/babel-preset",
      // NativeWind v4 (dùng className / Tailwind trong React Native)
      "nativewind/babel",
    ],
    plugins: [
      // Biến môi trường từ `.env` → import từ module ảo `@env` (xem `.env.example`)
      ["module:react-native-dotenv"],
      [
        "module-resolver",
        {
          root: ["./"],
          alias: { "@": "./src" },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      // BẮT BUỘC và phải đứng CUỐI (worklets của reanimated — NativeWind/Reusables dùng)
      "react-native-reanimated/plugin",
    ],
  };
};
