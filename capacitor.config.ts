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
    // Native Google Auth plugin (account picker) — uncomment + install plugin:
    // npm install <capacitor-8-compatible-google-auth-plugin>
    // GoogleAuth: {
    //   clientId: "xxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    //   scopes: ["profile", "email"],
    // },
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
