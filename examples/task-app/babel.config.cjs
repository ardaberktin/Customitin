module.exports = {
  plugins: ['@babel/plugin-transform-export-namespace-from'],
  presets: [
    process.env.CUSTOMITIN_WEB_BUILD === '1'
      ? 'babel-preset-expo'
      : 'module:@react-native/babel-preset',
  ],
};
