import { defineConfig, Platform } from "appwright";
import path from "path";

export default defineConfig({
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  projects: [
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: "browserstack",
          name: "Google Pixel 8",
          osVersion: "14.0",
        },
        appBundleId: "org.wikipedia",
        buildPath: path.join("/mnt/data/apk-storage", "wikipedia.apk"), // Update to use PV mount path
        video: "on",
      },
    },
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        device: {
          provider: "browserstack",
          name: "iPhone 14",
          osVersion: "16.0",
        },
       // appBundleId: "com.experitest.ExperiBankUIAutomation",
        buildPath: path.join("/mnt/data/apk-storage", "RetroArch.ipa"),  // Adjust this if needed
      },
    },
  ],
});
