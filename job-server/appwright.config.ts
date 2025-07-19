import { defineConfig, Platform } from "appwright";
import path from "path";

export default defineConfig({
  reporter: [
    ['html', { open: 'never' }], // generate report but don't open/serve it
    ['list'],                    // show list output in console
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
        buildPath: path.join("builds", "wikipedia.apk"),
        video: "on",
      },
    },
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        device: {
          provider: "lambdatest",
          name: "iPhone 14",
          osVersion: "14.0",
        },
        appBundleId: "com.microsoft.onenote",
        buildPath: path.join("builds", "Wikipedia.app"),
      },
    },
  ],
});

