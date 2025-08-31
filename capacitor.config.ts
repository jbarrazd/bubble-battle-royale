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
    // Disable iOS rubber band scrolling
    scrollEnabled: false,
    // Allow inline media playback
    allowsInlineMediaPlayback: true,
    // Content configuration
    contentInset: 'automatic',
    // Disable swipe navigation
    allowsBackForwardNavigationGestures: false,
    // Performance optimizations
    limitsNavigationsToAppBoundDomains: true,
    // Prefer the faster WKWebView
    preferredContentMode: 0,
    // WKWebView Configuration for better performance
    configuration: {
      preferences: {
        javaScriptCanOpenWindowsAutomatically: false,
        javaScriptEnabled: true
      },
      allowsInlineMediaPlayback: true,
      mediaTypesRequiringUserActionForPlayback: [],
      suppressesIncrementalRendering: false,
      allowsAirPlayForMediaPlayback: false,
      applicationNameForUserAgent: 'BubbleClash/1.0'
    }
  },
  plugins: {
    Haptics: {
      // Enable haptics plugin
    }
  }
};

export default config;
