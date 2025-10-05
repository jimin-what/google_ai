// tailwind.config.js
/** @type {import('tailwindcss').Config} */
const nativewind = require("nativewind/preset");

module.exports = {
  presets: [nativewind], // ✅ 반드시 이 형식
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./index.js", // ✅ 루트 index.js도 포함
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
