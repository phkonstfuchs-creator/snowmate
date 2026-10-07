import type { CapacitorConfig } from "@capacitor/cli";

/* The store apps show the deployed Pistl app (ADR 0031). Nothing secret
   belongs in this file: it ships inside every app download. */
const config: CapacitorConfig = {
  appId: "app.pistl",
  appName: "pistl.",
  /* Only the offline page lives on the device. */
  webDir: "www",
  appendUserAgent: "PistlApp/1.0",
  backgroundColor: "#f6f7f4",
  zoomEnabled: false,
  server: {
    url: "https://app.pistl.app",
    /* Pistl's own sites stay inside the app; every other link opens in
       the system browser. Each origin here also gets the native bridge. */
    allowNavigation: ["app.pistl.app", "pistl.app"],
    errorPath: "offline.html",
    cleartext: false,
  },
  ios: {
    contentInset: "never",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    /* Keeps background location updates flowing past five minutes. */
    useLegacyBridge: true,
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#f6f7f4",
      showSpinner: false,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f6f7f4",
      overlaysWebView: false,
    },
  },
};

export default config;
