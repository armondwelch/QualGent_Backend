import { defineConfig, Platform } from "appwright";
import path from "path";

export default defineConfig({
  projects: [
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        browserName: "webkit", // Still likely needed
        // Instead of a top-level 'device' object, try nesting LambdaTest options directly
        // This is a common Playwright pattern for cloud providers
        'lambdatest:options': { // This key might vary, check Appwright docs!
          'platformName': 'iOS', // OS on LambdaTest, e.g., 'iOS' or 'MacOS Ventura'
          'deviceName': 'iPhone 14 Pro', // Specific device name as per LambdaTest
          'platformVersion': '14',      // OS version on LambdaTest
          'app': 'bs://<hashed-app-id>', // Or a local path if Appwright handles upload
          // Replace 'bs://<hashed-app-id>' with your LambdaTest app upload URL/ID
          // build: 'QualGent iOS Build', // Your custom build name
          // project: 'QualGent App Tests', // Your custom project name
          'build': 'Playwright Appwright Build',
          'project': 'QualGent',
          'autoGrantPermissions': true, // Example capability
          'devicelog': true,           // Example capability
          'networkLogs': true,         // Example capability
          'video': true,
          'console': true
        },
        buildPath: path.join("builds", "Wikipedia.app"), // Might still be useful for local builds
      } as any, // Keep as any if TypeScript still complains
    },
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        browserName: "chromium", // Still likely needed
        'lambdatest:options': { // This key might vary, check Appwright docs!
          'platformName': 'Android',
          'deviceName': 'Pixel 7', // Specific device name as per LambdaTest
          'platformVersion': '10',
          'app': 'bs://<hashed-app-id>', // Or a local path if Appwright handles upload
          // build: 'QualGent Android Build',
          // project: 'QualGent App Tests',
          'build': 'Playwright Appwright Build',
          'project': 'QualGent',
          'autoGrantPermissions': true,
          'devicelog': true,
          'networkLogs': true,
          'video': true,
          'console': true
        },
        buildPath: path.join("builds", "wikipedia.apk"), // Might still be useful for local builds
      } as any, // Keep as any if TypeScript still complains
    },
  ],
});
