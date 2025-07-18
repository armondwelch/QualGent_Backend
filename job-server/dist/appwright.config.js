"use strict";
// appwright.config.ts
Object.defineProperty(exports, "__esModule", { value: true });
const appwright_1 = require("appwright");
exports.default = (0, appwright_1.defineConfig)({
    projects: [
        {
            name: "android",
            use: {
                platform: appwright_1.Platform.ANDROID,
                device: {
                    provider: "lambdatest", // Options: 'lambdatest', 'local-device', 'browserstack'
                    name: "Google Pixel 8",
                    osVersion: "14.0",
                },
                buildPath: "app-release.apk", // Make sure this path is correct relative to project root
            },
        },
        {
            name: "ios",
            use: {
                platform: appwright_1.Platform.IOS,
                device: {
                    provider: "lambdatest",
                    name: "iPhone 16",
                    osVersion: "18",
                },
                buildPath: "app-release.app", // Update this path if needed
            },
        },
    ],
});
