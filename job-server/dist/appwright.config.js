"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const appwright_1 = require("appwright");
const path_1 = __importDefault(require("path"));
exports.default = (0, appwright_1.defineConfig)({
    reporter: [
        ['html', { open: 'never' }], // generate report but don't open/serve it
        ['list'], // show list output in console
    ],
    projects: [
        {
            name: "android",
            use: {
                platform: appwright_1.Platform.ANDROID,
                device: {
                    provider: "browserstack",
                    name: "Google Pixel 8",
                    osVersion: "14.0",
                },
                appBundleId: "org.wikipedia",
                buildPath: path_1.default.join("builds", "wikipedia.apk"),
                video: "on",
            },
        },
        {
            name: "ios",
            use: {
                platform: appwright_1.Platform.IOS,
                device: {
                    provider: "lambdatest",
                    name: "iPhone 14",
                    osVersion: "14.0",
                },
                appBundleId: "com.microsoft.onenote",
                buildPath: path_1.default.join("builds", "Wikipedia.app"),
            },
        },
    ],
});
