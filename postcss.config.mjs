const config = {
  plugins: [
    "@tailwindcss/postcss",
    // Add autoprefixer to handle browser compatibility
    ...(process.env.NODE_ENV === 'production' ? [] : [])
  ],
};

export default config;
