// app.config.js — config chính của app, key được nhúng trực tiếp vào extra
// để đảm bảo hoạt động trong cả Expo Go lẫn production APK build.

const OPENAI_API_KEY =
  process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export default ({ config }) => ({
  ...config,
  name: 'QuestBoard',
  slug: 'QuestBoard',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/03ae813e-aeef-434d-8ef4-d75f72c18a0f',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
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
    openaiApiKey: OPENAI_API_KEY,
    eas: {
      projectId: '03ae813e-aeef-434d-8ef4-d75f72c18a0f',
    },
  },
});
