import type { CapacitorConfig } from "@capacitor/cli";

const LIVE_URL = "https://recipe-r33z9gv7r-eroomekim-3797s-projects.vercel.app";

const config: CapacitorConfig = {
  appId: "com.recipebook.app",
  appName: "Recipe Book",
  webDir: "out",
  server: {
    url: LIVE_URL,
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#FFFFFF",
    },
  },
};

export default config;
