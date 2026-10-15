module.exports = {
  root: true,
  extends: "@react-native",
  rules: {
    "react-native/no-inline-styles": "off",
    // Quy ước code của dự án (khớp .prettierrc): double-quote, có chấm phẩy, dùng `void` cho promise
    quotes: "off",
    semi: "off",
    curly: "off",
    "no-void": "off",
    "react/react-in-jsx-scope": "off",
  },
};
