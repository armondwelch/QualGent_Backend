const { defineConfig, Platform } = require("appwright");
const path = require("path");

exports.default = defineConfig({
  // This is the crucial part: Define the global device provider here
  deviceProvider: {
    name: "lambdatest", // <--- This tells Appwright to use LambdaTest
    // Any global LambdaTest options can go here, if Appwright supports them
    // For example, if you want all projects to use a specific build name by default:
    // options: {
    //   build: 'My Global Appwright Build',
    // },
  },

  projects: [
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        browserName: "webkit", // Still relevant for iOS web views
        
        // These options within 'use' will be passed as capabilities to LambdaTest
        // Appwright's LambdaTest provider should map these automatically.
        // You generally don't need the 'lambdatest:options' wrapper here.
        platformName: 'iOS', // OS on LambdaTest, e.g., 'iOS'
        deviceName: 'iPhone 14 Pro', // Specific device name as per LambdaTest
        platformVersion: '17', // OS version on LambdaTest (e.g., '17' for latest iOS)
        
        // IMPORTANT: Update this to your LambdaTest app upload URL/ID
        // It's typically 'lt://<hashed-app-id>' for LambdaTest
        app: 'lt://<hashed-app-id>', // Replace with your actual LambdaTest app ID
        
        build: 'QualGent iOS Build', // Your custom build name for LambdaTest
        project: 'QualGent App Tests', // Your custom project name for LambdaTest

        // Other LambdaTest capabilities you might want to include:
        autoGrantPermissions: true,
        devicelog: true,
        networkLogs: true,
        video: true,
        console: true,
        
        // buildPath is for local builds, likely not needed when using a cloud provider like LambdaTest
        // Unless Appwright uses it to upload the app for you.
        // If your app is pre-uploaded to LambdaTest, you'd use the 'app' capability above.
        // buildPath: path.join("builds", "Wikipedia.app"), 
      },
    },
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        browserName: "chromium", // Or 'chrome' depending on Appwright's mapping
        
        platformName: 'Android',
        deviceName: 'Pixel 7', // Example Android device
        platformVersion: '13', // Example Android version
        
        // IMPORTANT: Update this to your LambdaTest app upload URL/ID for Android
        app: 'lt://<hashed-android-app-id>', // Replace with your actual LambdaTest Android app ID
        
        build: 'QualGent Android Build',
        project: 'QualGent App Tests',

        autoGrantPermissions: true,
        devicelog: true,
        networkLogs: true,
        video: true,
        console: true,
      },
    },
  ],

  // Other top-level Appwright configurations (from your error log, for context):
  // rootDir: "/home/aqw/project/QualGent_Backend/job-server/tests",
  // forbidOnly: false,
  // fullyParallel: true,
  // globalSetup: "/home/aqw/project/QualGent_Backend/job-server/node_modules/appwright/dist/global-setup.js",
  // globalTeardown: null,
  // globalTimeout: 0,
  // grep: {},
  // grepInvert: null,
  // maxFailures: 0,
  // metadata: {},
  // preserveOutput: "always",
  // reporter: [
  //   ["list", null],
  //   ["json", null],
  //   ["html", null],
  // ],
  // reportSlowTests: {
  //   max: 5,
  //   threshold: 300000
  // },
  // quiet: false,
  // shard: null,
  // updateSnapshots: "missing",
  // updateSourceMethod: "patch",
  // version: "1.54.1",
  // workers: 2,
  // webServer: null
});

