import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.recipebook.app",
  appName: "Recipe Book",
  webDir: "out",
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
