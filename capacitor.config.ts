import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.kovina.ledger",
  appName: "OpenLedger",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
    GoogleAuth: {
      // Set this to your Google Cloud OAuth web client ID for the native
      // account picker to work. Get it from:
      //   Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Web Client
      // clientId: "xxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#F5F0E8",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
