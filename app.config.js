// app.config.js — thay thế app.json để inject biến môi trường vào build
// Khi build APK, process.env.EXPO_PUBLIC_OPENAI_API_KEY từ .env sẽ được
// nhúng vào bundle thông qua extra, đọc bằng expo-constants.

export default ({ config }) => ({
  ...config,
  name: 'QuestBoard',
  slug: 'QuestBoard',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    package: 'com.dangpkzxy.QuestBoard',
    googleServicesFile: './google-services.json',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-notifications'],
  extra: {
    openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
    eas: {
      projectId: '03ae813e-aeef-434d-8ef4-d75f72c18a0f',
    },
  },
});
