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
          provider: "local-device",
          name: process.env.ANDROID_EMULATOR_HOST || "34.46.226.111:5555",
        },
        appBundleId: "org.wikipedia",
        buildPath: path.join("/mnt/data/apk-storage", "wikipedia.apk"),
        video: "off",
      },
    },
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        device: {
          provider: "local-device",
          name: process.env.IOS_SIMULATOR_HOST || "34.70.141.104:4723",
        },
        buildPath: path.join("/mnt/data/apk-storage", "RetroArch.ipa"),
        video: "off",
        
        // Try these possible WebDriver URL configurations:
        
        // Option A: Direct webDriverUrl
        webDriverUrl: "http://34.70.141.104:4723/wd/hub",
        
        // Option B: Server configuration
        // server: {
        //   host: "34.70.141.104",
        //   port: 4723,
        //   path: "/wd/hub"
        // },
        
        // Option C: Remote configuration
        // remote: {
        //   hostname: "34.70.141.104",
        //   port: 4723,
        //   path: "/wd/hub"
        // },
        
        // Option D: Appium server config
        // appiumServer: "http://34.70.141.104:4723/wd/hub",
      },
    },
  ],
});
