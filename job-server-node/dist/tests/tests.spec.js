"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appwright_1 = require("appwright");
(0, appwright_1.test)("Open Playwright on Wikipedia and verify Microsoft is visible", async ({ device, }) => {
    // Dismiss splash screen
    await device.getByText("Skip").tap();
    // Enter search term
    const searchInput = device.getByText("Search Wikipedia", { exact: true });
    await searchInput.tap();
    await searchInput.fill("playwright");
    // Open search result and assert
    await device.getByText("Playwright (software)").tap();
    await (0, appwright_1.expect)(device.getByText("Microsoft")).toBeVisible();
});
