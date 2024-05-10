// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{astro,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      maxWidth: {
        "8xl": "90rem",
        "9xl": "95rem",
      },
    },
  },
  plugins: [],
};