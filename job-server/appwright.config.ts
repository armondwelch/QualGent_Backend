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
          provider: "local-device",  // Changed from "emulator"
          name: process.env.ANDROID_EMULATOR_HOST || "34.56.143.27:5555",
        },
        appBundleId: "org.wikipedia",
        buildPath: path.join("/mnt/data/apk-storage", "wikipedia.apk"),
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
        buildPath: path.join("/mnt/data/apk-storage", "RetroArch.ipa"),
      },
    },
  ],
});
