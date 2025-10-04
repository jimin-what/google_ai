// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }], // 수정된 부분
      "nativewind/babel"
    ],
    plugins: [], // 'nativewind/babel'은 presets으로 이동했습니다.
  };
};