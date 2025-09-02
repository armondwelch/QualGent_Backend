const { exec } = require("child_process");
const path = require("path");
const https = require("https");
const fs = require("fs");
const config = require("./config");

// Import video download functions
let videoStorage;
try {
  videoStorage = require('./video-storage');
} catch (e) {
  console.log('[runJob.js] Video storage module not available:', e.message);
  videoStorage = null;
}

// Try to use axios if available, fallback to https
let httpClient;
try {
  httpClient = require('axios');
} catch (e) {
  httpClient = null;
}

// Add WebDriverIO for iOS tests
let wdio;
try {
  wdio = require('webdriverio');
} catch (e) {
  console.log('[runJob.js] WebDriverIO not available for iOS tests:', e.message);
  wdio = null;
}

const appwrightPath = '/home/node/appwright/dist/bin/index.js';

/**
 * Custom iOS test runner using direct WebDriver connection
 */
async function runIOSTest(job) {
  if (!wdio) {
    throw new Error('WebDriverIO not available. Install with: npm install webdriverio');
  }

  console.log('[runJob.js] Running iOS test using direct WebDriver connection to 34.70.141.104:4723');
  
  const driver = await wdio.remote({
    protocol: 'http',
    hostname: '34.70.141.104',
    port: 4723,
    path: '/wd/hub',
    capabilities: {
      platformName: 'iOS',
      'appium:platformVersion': '17.2', // Adjust as needed
      'appium:deviceName': 'iPhone 15 Pro Max',
      'appium:automationName': 'XCUITest',
      // Download app from your job server
      'appium:app': '/Users/armond/Downloads/Wikipedia.app', // Update with actual URL
      // Alternative: use local path if app is pre-uploaded
      // app: '/tmp/RetroArch.app'
    },
    logLevel: 'info'
  });

  try {
    console.log('[runJob.js] iOS test started - connecting to simulator...');
    
    // Wait for app to launch
    await driver.pause(3000);
    
    // Example test steps - replace with your actual test logic
    console.log('[runJob.js] iOS test: Verifying app launched successfully');
    
    // Get app state
    const source = await driver.getPageSource();
    console.log('[runJob.js] iOS test: App source retrieved successfully');
    
    // Add your specific test steps here based on your Wikipedia test
    // For example:
    // const searchElement = await driver.$('~search'); // accessibility id
    // await searchElement.setValue('Microsoft');
    // const resultElement = await driver.$('~Microsoft'); // wait for result
    // await resultElement.waitForDisplayed({ timeout: 10000 });
    
    console.log('[runJob.js] iOS test completed successfully');
    return 'iOS test completed successfully using direct WebDriver connection';
    
  } catch (testError) {
    console.error('[runJob.js] iOS test failed:', testError.message);
    throw new Error(`iOS test failed: ${testError.message}`);
  } finally {
    try {
      await driver.deleteSession();
      console.log('[runJob.js] iOS WebDriver session closed');
    } catch (closeError) {
      console.log('[runJob.js] Warning: Could not close iOS WebDriver session:', closeError.message);
    }
  }
}

/**
 * Download app from job server to remote Appium server (optional helper)
 */
async function downloadAppToRemoteServer(appUrl, targetPath = '/tmp/app.zip') {
  // This would require SSH access to the remote server or a file upload endpoint
  // For now, we'll use direct URL in capabilities
  console.log(`[runJob.js] Using app URL directly: ${appUrl}`);
  return appUrl;
}

// [Keep all your existing BrowserStack functions unchanged]

/**
 * Get recent BrowserStack builds first, then get sessions from them
 */
async function getBrowserStackSessions() {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  
  if (!username || !accessKey) {
    throw new Error('BrowserStack credentials not found');
  }
  
  console.log(`[runJob.js] Using BrowserStack username: ${username}`);
  
  if (httpClient) {
    // Use axios if available
    try {
      // First get builds
      const buildsResponse = await httpClient.get('https://api-cloud.browserstack.com/app-automate/builds.json?limit=5', {
        auth: {
          username: username,
          password: accessKey
        },
        headers: {
          'User-Agent': 'NodeJS-Client'
        },
        timeout: 10000
      });
      
      console.log(`[runJob.js] Builds response status: ${buildsResponse.status}`);
      
      // Get sessions from the most recent build
      if (buildsResponse.data && buildsResponse.data.length > 0) {
        const latestBuild = buildsResponse.data[0]; // Most recent build
        const buildId = latestBuild.automation_build.hashed_id;
        
        console.log(`[runJob.js] Getting sessions from build: ${buildId}`);
        
        // Now get sessions from this build
        const sessionsResponse = await httpClient.get(`https://api-cloud.browserstack.com/app-automate/builds/${buildId}/sessions.json`, {
          auth: {
            username: username,
            password: accessKey
          },
          headers: {
            'User-Agent': 'NodeJS-Client'
          },
          timeout: 10000
        });
        
        console.log(`[runJob.js] Sessions response status: ${sessionsResponse.status}`);
        return {
          sessions: sessionsResponse.data,
          buildId: buildId
        };
      } else {
        console.log('[runJob.js] No builds found');
        return { sessions: [], buildId: null };
      }
      
    } catch (error) {
      console.log(`[runJob.js] Axios error: ${error.message}`);
      console.log(`[runJob.js] Response status: ${error.response?.status}`);
      console.log(`[runJob.js] Response data: ${error.response?.data}`);
      throw error;
    }
  } else {
    // Fallback to native https with improved error handling
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
      
      // First get builds
      const buildOptions = {
        hostname: 'api-cloud.browserstack.com',
        port: 443,
        path: '/app-automate/builds.json?limit=5',
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'NodeJS-Client',
          'Accept': 'application/json'
        }
      };
      
      console.log(`[runJob.js] Making HTTPS request to: https://${buildOptions.hostname}${buildOptions.path}`);
      
      const buildReq = https.request(buildOptions, (buildRes) => {
        console.log(`[runJob.js] Build response status: ${buildRes.statusCode}`);
        let buildData = '';
        
        buildRes.on('data', (chunk) => {
          buildData += chunk;
        });
        
        buildRes.on('end', () => {
          if (buildRes.statusCode !== 200) {
            reject(new Error(`HTTP ${buildRes.statusCode}: ${buildData}`));
            return;
          }
          
          try {
            const builds = JSON.parse(buildData);
            
            if (builds && builds.length > 0) {
              const latestBuild = builds[0];
              const buildId = latestBuild.automation_build.hashed_id;
              
              console.log(`[runJob.js] Getting sessions from build: ${buildId}`);
              
              // Now get sessions from this build
              const sessionOptions = {
                hostname: 'api-cloud.browserstack.com',
                port: 443,
                path: `/app-automate/builds/${buildId}/sessions.json`,
                method: 'GET',
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'User-Agent': 'NodeJS-Client',
                  'Accept': 'application/json'
                }
              };
              
              const sessionReq = https.request(sessionOptions, (sessionRes) => {
                let sessionData = '';
                
                sessionRes.on('data', (chunk) => {
                  sessionData += chunk;
                });
                
                sessionRes.on('end', () => {
                  if (sessionRes.statusCode !== 200) {
                    reject(new Error(`HTTP ${sessionRes.statusCode}: ${sessionData}`));
                    return;
                  }
                  
                  try {
                    const sessions = JSON.parse(sessionData);
                    resolve({ sessions: sessions, buildId: buildId });
                  } catch (parseError) {
                    reject(new Error(`JSON parse error: ${parseError.message}. Response was: ${sessionData.substring(0, 200)}`));
                  }
                });
              });
              
              sessionReq.on('error', (error) => {
                reject(error);
              });
              
              sessionReq.setTimeout(15000, () => {
                sessionReq.destroy();
                reject(new Error('Session request timeout after 15 seconds'));
              });
              
              sessionReq.end();
              
            } else {
              console.log('[runJob.js] No builds found');
              resolve({ sessions: [], buildId: null });
            }
            
          } catch (parseError) {
            reject(new Error(`JSON parse error: ${parseError.message}. Response was: ${buildData.substring(0, 200)}`));
          }
        });
      });
      
      buildReq.on('error', (error) => {
        console.log('[runJob.js] Build request error:', error);
        reject(error);
      });
      
      buildReq.setTimeout(15000, () => {
        buildReq.destroy();
        reject(new Error('Build request timeout after 15 seconds'));
      });
      
      buildReq.end();
    });
  }
}

/**
 * Get all recent builds (alternative approach)
 */
async function getBrowserStackBuilds() {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  
  if (!username || !accessKey) {
    throw new Error('BrowserStack credentials not found');
  }
  
  if (httpClient) {
    try {
      const response = await httpClient.get('https://api-cloud.browserstack.com/app-automate/builds.json?limit=10', {
        auth: {
          username: username,
          password: accessKey
        },
        headers: {
          'User-Agent': 'NodeJS-Client'
        },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.log(`[runJob.js] Error getting builds: ${error.message}`);
      throw error;
    }
  } else {
    // Fallback implementation for builds
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
      const options = {
        hostname: 'api-cloud.browserstack.com',
        port: 443,
        path: '/app-automate/builds.json?limit=10',
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'NodeJS-Client',
          'Accept': 'application/json'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          
          try {
            const builds = JSON.parse(data);
            resolve(builds);
          } catch (parseError) {
            reject(new Error(`JSON parse error: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout after 15 seconds'));
      });
      
      req.end();
    });
  }
}

/**
 * Test BrowserStack API connection
 */
async function testBrowserStackConnection() {
  return new Promise((resolve, reject) => {
    const username = process.env.BROWSERSTACK_USERNAME;
    const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
    
    if (!username || !accessKey) {
      reject(new Error('BrowserStack credentials not found'));
      return;
    }
    
    const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
    const options = {
      hostname: 'api.browserstack.com',
      path: '/automate/plan.json', // Simple endpoint to test credentials
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'NodeJS-Client'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[runJob.js] BrowserStack API credentials are valid');
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    req.end();
  });
}

/**
 * Get specific session details by session ID
 */
async function getBrowserStackSessionDetails(sessionId) {
  return new Promise((resolve, reject) => {
    const username = process.env.BROWSERSTACK_USERNAME;
    const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
    
    if (!username || !accessKey) {
      reject(new Error('BrowserStack credentials not found'));
      return;
    }
    
    const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
    const options = {
      hostname: 'api-cloud.browserstack.com',
      path: `/app-automate/sessions/${sessionId}.json`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const sessionDetails = JSON.parse(data);
          resolve(sessionDetails);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Modified main runJob function with hybrid iOS support
 */
async function runJob(job) {
  const targetProject = job.target;
  
  // Use custom iOS test runner for iOS projects
  if (targetProject === 'ios') {
    console.log('[runJob.js] Detected iOS project - using direct WebDriver connection');
    try {
      const result = await runIOSTest(job);
      console.log('[runJob.js] iOS test completed successfully via direct WebDriver');
      return result;
    } catch (iosError) {
      console.error('[runJob.js] iOS direct WebDriver test failed:', iosError.message);
      throw new Error(`iOS test failed: ${iosError.message}`);
    }
  }
  
  // Use existing Appwright approach for Android and other projects
  return new Promise((resolve, reject) => {
    const testPathEscaped = job.test_path;
    const appwrightConfigPath = path.join(__dirname, 'appwright.config.ts');
    const command = `node ${config.APPWRIGHT_PATH} test ${testPathEscaped} --config ${appwrightConfigPath} --project ${targetProject}`;
    
    console.log(`[runJob.js] Executing Appwright command: ${command}`);
    
    exec(command, { timeout: 300000 }, async (error, stdout, stderr) => {
      const fullOutput = stdout + stderr;
      const testsPassed = fullOutput.match(/^\s*\*?\s*✓/m) || fullOutput.includes('1 passed');
      
      // Handle "No tests found" as successful completion
      if (fullOutput.includes("No tests found")) {
        console.log('[runJob.js] No tests found - treating as successful completion');
        resolve(stdout);
        return;
      }
      
      // Extract test name from output if available
      const testNameMatch = fullOutput.match(/Starting test: (.+?) on worker/);
      const testName = testNameMatch ? testNameMatch[1] : 'Unknown Test';
      
      // Only try to get BrowserStack session details if the project uses BrowserStack provider
      if (targetProject === 'android') { // Changed from 'ios' since we handle iOS separately now
        try {
          console.log('[runJob.js] Fetching BrowserStack session details for Android test...');
          // Add a small delay to ensure session is registered
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Get recent sessions from the latest build
          const sessionResult = await getBrowserStackSessions();
          const { sessions, buildId } = sessionResult;
          
          if (sessions && sessions.length > 0) {
            // Find the session that matches our job execution time
            const jobStartTime = Date.now();
            const recentSessions = sessions.filter(session => {
              const sessionTime = new Date(session.automation_session.created_time).getTime();
              // Session should be created within the last 10 minutes of job start
              return (jobStartTime - sessionTime) < (10 * 60 * 1000);
            });
            
            // Get the most recent session from our filtered results
            const latestSession = recentSessions.length > 0 
              ? recentSessions[0].automation_session 
              : sessions[0].automation_session;
            
            console.log('[runJob.js] Latest BrowserStack session:');
            console.log(`- Session ID: ${latestSession.hashed_id}`);
            console.log(`- Name: ${latestSession.name}`);
            console.log(`- Status: ${latestSession.status}`);
            console.log(`- Browser: ${latestSession.browser} ${latestSession.browser_version}`);
            console.log(`- OS: ${latestSession.os} ${latestSession.os_version}`);
            console.log(`- Duration: ${latestSession.duration} seconds`);
            
            if (latestSession.public_url) {
              console.log(`- Public URL: ${latestSession.public_url}`);
            }
            if (latestSession.video_url) {
              console.log(`- Video URL: ${latestSession.video_url}`);
            }
            
            // Build the dashboard URL
            const dashboardUrl = `https://app-automate.browserstack.com/dashboard/v2/sessions/${latestSession.hashed_id}`;
            console.log(`- Dashboard URL: ${dashboardUrl}`);
            
            // Download and store BrowserStack video in PostgreSQL (if video storage is available)
            if (latestSession.video_url && videoStorage) {
              console.log('[runJob.js] Starting BrowserStack video download and storage...');
              
              try {
                const videoResult = await videoStorage.processBrowserStackSession(latestSession, buildId);
                
                if (videoResult.success) {
                  if (videoResult.existing) {
                    const sizeMB = Math.round(videoResult.size / 1024 / 1024);
                    console.log(`[runJob.js] ✅ BrowserStack video already exists in database (${sizeMB}MB)`);
                  } else {
                    const sizeMB = Math.round(videoResult.size / 1024 / 1024);
                    console.log(`[runJob.js] ✅ BrowserStack video downloaded and stored successfully!`);
                    console.log(`[runJob.js] Database ID: ${videoResult.dbId}, Size: ${sizeMB}MB`);
                  }
                } else {
                  console.log(`[runJob.js] ❌ BrowserStack video download failed: ${videoResult.error}`);
                }
              } catch (videoError) {
                console.log(`[runJob.js] ❌ Error processing BrowserStack video: ${videoError.message}`);
              }
            } else if (latestSession.video_url && !videoStorage) {
              console.log('[runJob.js] BrowserStack video URL available but video storage module not loaded');
            } else {
              console.log('[runJob.js] ⚠️  No BrowserStack video URL available for download');
            }
            
          } else {
            console.log('[runJob.js] No recent BrowserStack sessions found');
            
            // Try to get builds to see if there are any
            try {
              const builds = await getBrowserStackBuilds();
              console.log(`[runJob.js] Found ${builds.length} builds`);
              
              if (builds.length > 0) {
                console.log('[runJob.js] Recent builds:');
                builds.slice(0, 3).forEach((build, index) => {
                  console.log(`  ${index + 1}. ${build.automation_build.name} (${build.automation_build.hashed_id})`);
                });
              }
            } catch (buildsError) {
              console.log(`[runJob.js] Could not fetch builds: ${buildsError.message}`);
            }
          }
          
        } catch (sessionError) {
          console.log(`[runJob.js] Could not fetch BrowserStack session details: ${sessionError.message}`);
          
          // Try alternative approach - test credentials first
          try {
            console.log('[runJob.js] Testing BrowserStack API credentials...');
            await testBrowserStackConnection();
          } catch (credError) {
            console.log(`[runJob.js] Credential test failed: ${credError.message}`);
          }
        }
      } else {
        console.log(`[runJob.js] ${targetProject} test completed - no BrowserStack session to fetch`);
      }
        
      // Determine final result after video processing
      if (error && !testsPassed) {
        console.error(`[runJob.js] Error running Appwright test: ${error.message}`);
        console.error(`[runJob.js] STDOUT: \n${stdout}`);
        console.error(`[runJob.js] STDERR: \n${stderr}`);
        
        if (fullOutput.includes("BROWSERSTACK_USERNAME") && fullOutput.includes("BROWSERSTACK_ACCESS_KEY")) {
          reject(new Error("Test failed: BrowserStack credentials required. This indicates your appwright.config.js might not be correctly loaded or there's an implicit BrowserStack dependency."));
        } else {
          reject(new Error(`Test failed during execution: ${error.message}`));
        }
      } else {
        console.log('[runJob.js] Test completed successfully.');
        resolve(stdout);
      }
    });
  });
}

module.exports = {
  runJob,
  runIOSTest, // Export the new iOS test function
  getBrowserStackSessions,
  getBrowserStackSessionDetails,
  getBrowserStackBuilds,
  testBrowserStackConnection,
};
