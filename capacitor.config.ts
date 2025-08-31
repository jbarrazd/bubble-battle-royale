import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bubbleclash.game',
  appName: 'Bubble Clash',
  webDir: 'dist',
  server: {
    // iOS performance optimizations
    iosScheme: 'capacitor',
    androidScheme: 'https'
  },
  ios: {
    // SIMPLIFIED: Minimal configuration like Safari
    scrollEnabled: false,
    allowsInlineMediaPlayback: true,
    allowsBackForwardNavigationGestures: false,
    // REMOVED: preferredContentMode and other optimizations that may cause overhead
    // Let iOS use default settings which work better
  },
  plugins: {
    Haptics: {
      // Enable haptics plugin
    }
  }
};

export default config;
