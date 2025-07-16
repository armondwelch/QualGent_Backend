import { defineConfig, devices } from 'appwright';

export default defineConfig({
  testDir: '/home/aqw/projects/QueueForge/tests',
  timeout: 30000,
  retries: 1,
  reporter: [['list'], ['html']],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // projects: [
  //   {
  //     name: 'chromium',
  //     use: { ...devices['Desktop Chrome'] },
  //   },
  //   {
  //     name: 'firefox',
  //     use: { ...devices['Desktop Firefox'] },
  //   },
  //   {
  //     name: 'webkit',
  //     use: { ...devices['Desktop Safari'] },
  //   },
  //   // add more devices or BrowserStack configs if needed
  // ],
});
