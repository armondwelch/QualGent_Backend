import { defineConfig, Platform } from "appwright";
import path from "path"; // Required for path.join to work

export default defineConfig({
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
        app: "lt://APP1016045651752855351824129", // Add your real Android app package name here
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
        app: "lt://APP10160301691752854958607412",
	appBundleId: "com.microsoft.onenote", // Add your iOS app bundle ID here
	buildPath: path.join("builds", "Wikipedia.app"),
      },
    },
  ],
});
