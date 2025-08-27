const https = require('https');
const http = require('http');
const { Pool } = require('pg');
const { URL } = require('url');

// PostgreSQL connection pool optimized for Kubernetes
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres-service',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qualgentdb',
  user: process.env.POSTGRES_USER || 'qualgentuser',
  password: process.env.POSTGRES_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  acquireTimeoutMillis: 60000
});

// Handle pool connection errors
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client', err);
});

/**
 * Test database connection with retry logic
 */
async function testDatabaseConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('[DB] Database connection successful');
      return true;
    } catch (error) {
      console.log(`[DB] Connection attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }
  throw new Error('Failed to connect to database after multiple attempts');
}

/**
 * Initialize the PostgreSQL database and create tables if they don't exist
 */
async function initializeDatabase() {
  await testDatabaseConnection();
  
  const client = await pool.connect();
  try {
    // Create videos table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS browserstack_videos (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        session_name VARCHAR(500),
        build_id VARCHAR(255),
        video_url VARCHAR(1000),
        video_data BYTEA,
        file_size BIGINT,
        content_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'downloaded',
        os VARCHAR(50),
        os_version VARCHAR(50),
        device VARCHAR(200),
        duration INTEGER,
        test_status VARCHAR(50),
        public_url VARCHAR(1000),
        dashboard_url VARCHAR(1000),
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_session_id ON browserstack_videos(session_id);
      CREATE INDEX IF NOT EXISTS idx_downloaded_at ON browserstack_videos(downloaded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_build_id ON browserstack_videos(build_id);
    `);
    
    console.log('[DB] Database table initialized successfully');
  } catch (error) {
    console.error('[DB] Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Download video using BrowserStack API authentication
 */
function downloadVideoWithAuth(videoUrl, username, accessKey) {
  return new Promise((resolve, reject) => {
    console.log(`[Video] Starting authenticated download from: ${videoUrl.substring(0, 100)}...`);
    
    const parsedUrl = new URL(videoUrl);
    const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'video/mp4,video/*,*/*',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive'
      },
      timeout: 180000 // 3 minute timeout for large videos
    };
    
    const request = https.request(videoUrl, options, (response) => {
      console.log(`[Video] Auth response status: ${response.statusCode}`);
      console.log(`[Video] Content-Type: ${response.headers['content-type']}`);
      console.log(`[Video] Content-Length: ${response.headers['content-length']}`);
      
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        console.log(`[Video] Following redirect to: ${redirectUrl}`);
        
        // Follow the redirect with auth
        return downloadVideoWithAuth(redirectUrl, username, accessKey)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        let errorBody = '';
        response.on('data', chunk => errorBody += chunk);
        response.on('end', () => {
          console.log(`[Video] Error response: ${errorBody.substring(0, 500)}`);
          reject(new Error(`Authenticated download failed: HTTP ${response.statusCode}`));
        });
        return;
      }
      
      const chunks = [];
      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers['content-length']) || 0;
      let lastLogTime = Date.now();
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
        downloadedBytes += chunk.length;
        
        // Log progress every 15 seconds
        const now = Date.now();
        if (totalBytes > 0 && (now - lastLogTime) > 15000) {
          const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const downloadedMB = Math.round(downloadedBytes / 1024 / 1024);
          const totalMB = Math.round(totalBytes / 1024 / 1024);
          console.log(`[Video] Download progress: ${progress}% (${downloadedMB}MB/${totalMB}MB)`);
          lastLogTime = now;
        }
      });
      
      response.on('end', () => {
        const videoBuffer = Buffer.concat(chunks);
        const sizeMB = Math.round(videoBuffer.length / 1024 / 1024);
        console.log(`[Video] Authenticated download completed. Total size: ${sizeMB}MB`);
        
        resolve({
          buffer: videoBuffer,
          contentType: response.headers['content-type'] || 'video/mp4',
          size: videoBuffer.length
        });
      });
      
      response.on('error', (error) => {
        console.error('[Video] Download stream error:', error);
        reject(error);
      });
    });
    
    request.on('error', (error) => {
      console.error('[Video] Request error:', error);
      reject(error);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Video download timeout after 3 minutes'));
    });
    
    request.end();
  });
}
function downloadVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    console.log(`[Video] Starting download from: ${videoUrl.substring(0, 100)}...`);
    
    const parsedUrl = new URL(videoUrl);
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    // Enhanced headers for BrowserStack video download
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'video/mp4,video/*,*/*',
        'Accept-Encoding': 'identity', // Don't use compression for video
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Referer': 'https://app-automate.browserstack.com/'
      },
      timeout: 120000, // 2 minute timeout
      followRedirect: true
    };
    
    const request = httpModule.request(videoUrl, options, (response) => {
      console.log(`[Video] Response status: ${response.statusCode}`);
      console.log(`[Video] Content-Type: ${response.headers['content-type']}`);
      console.log(`[Video] Content-Length: ${response.headers['content-length']}`);
      
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        console.log(`[Video] Following redirect to: ${redirectUrl}`);
        
        // Follow the redirect
        return downloadVideo(redirectUrl)
          .then(resolve)
          .catch(reject);
      }
      
      // Handle 403 errors specifically
      if (response.statusCode === 403) {
        console.log(`[Video] 403 Forbidden - Video URL may be expired or require different authentication`);
        reject(new Error(`Video access forbidden (403). The video URL may be expired or require browser-based access.`));
        return;
      }
      
      if (response.statusCode !== 200) {
        let errorBody = '';
        response.on('data', chunk => errorBody += chunk);
        response.on('end', () => {
          console.log(`[Video] Error response body: ${errorBody.substring(0, 200)}`);
          reject(new Error(`Failed to download video: HTTP ${response.statusCode}`));
        });
        return;
      }
      
      const chunks = [];
      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers['content-length']) || 0;
      let lastLogTime = Date.now();
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
        downloadedBytes += chunk.length;
        
        // Log progress every 10 seconds to avoid spam
        const now = Date.now();
        if (totalBytes > 0 && (now - lastLogTime) > 10000) {
          const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const downloadedMB = Math.round(downloadedBytes / 1024 / 1024);
          const totalMB = Math.round(totalBytes / 1024 / 1024);
          console.log(`[Video] Download progress: ${progress}% (${downloadedMB}MB/${totalMB}MB)`);
          lastLogTime = now;
        }
      });
      
      response.on('end', () => {
        const videoBuffer = Buffer.concat(chunks);
        const sizeMB = Math.round(videoBuffer.length / 1024 / 1024);
        console.log(`[Video] Download completed. Total size: ${sizeMB}MB`);
        
        resolve({
          buffer: videoBuffer,
          contentType: response.headers['content-type'] || 'video/mp4',
          size: videoBuffer.length
        });
      });
      
      response.on('error', (error) => {
        console.error('[Video] Download error:', error);
        reject(error);
      });
    });
    
    request.on('error', (error) => {
      console.error('[Video] Request error:', error);
      reject(error);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Video download timeout'));
    });
    
    request.end();
  });
}

/**
 * Store session metadata with video URL (preferred approach for BrowserStack)
 */
async function storeSessionMetadata(sessionData) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO browserstack_videos (
        session_id, session_name, build_id, video_url, 
        file_size, content_type, os, os_version, device, duration, 
        test_status, public_url, dashboard_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (session_id) 
      DO UPDATE SET 
        video_url = EXCLUDED.video_url,
        public_url = EXCLUDED.public_url,
        dashboard_url = EXCLUDED.dashboard_url,
        downloaded_at = CURRENT_TIMESTAMP
      RETURNING id, session_id;
    `;
    
    const values = [
      sessionData.session_id,
      sessionData.name,
      sessionData.build_id,
      sessionData.video_url,
      0, // file_size (no video content stored)
      'video/mp4', // content_type
      sessionData.os,
      sessionData.os_version,
      sessionData.device,
      sessionData.duration,
      sessionData.status,
      sessionData.public_url,
      sessionData.dashboard_url,
      'video_url_stored' // status indicates we have the URL for browser access
    ];
    
    const result = await client.query(query, values);
    console.log(`[DB] Session metadata with video URL stored. Record ID: ${result.rows[0].id}`);
    
    return result.rows[0];
  } catch (error) {
    console.error('[DB] Error storing session metadata:', error);
    throw error;
  } finally {
    client.release();
  }
}
async function storeVideoInDatabase(sessionData, videoData) {
  const client = await pool.connect();
  
  try {
    // Check if video already exists
    const existingCheck = await client.query(
      'SELECT id, file_size FROM browserstack_videos WHERE session_id = $1',
      [sessionData.session_id]
    );
    
    if (existingCheck.rows.length > 0) {
      console.log(`[DB] Video already exists for session ${sessionData.session_id}`);
      return {
        id: existingCheck.rows[0].id,
        existing: true,
        file_size: existingCheck.rows[0].file_size
      };
    }
    
    const query = `
      INSERT INTO browserstack_videos (
        session_id, session_name, build_id, video_url, video_data, 
        file_size, content_type, os, os_version, device, duration, 
        test_status, public_url, dashboard_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, session_id, file_size;
    `;
    
    const values = [
      sessionData.session_id,
      sessionData.name,
      sessionData.build_id,
      sessionData.video_url,
      videoData.buffer,
      videoData.size,
      videoData.contentType,
      sessionData.os,
      sessionData.os_version,
      sessionData.device,
      sessionData.duration,
      sessionData.status,
      sessionData.public_url,
      sessionData.dashboard_url
    ];
    
    const result = await client.query(query, values);
    const sizeMB = Math.round(result.rows[0].file_size / 1024 / 1024);
    console.log(`[DB] Video stored successfully. Record ID: ${result.rows[0].id}, Size: ${sizeMB}MB`);
    
    return result.rows[0];
  } catch (error) {
    console.error('[DB] Error storing video in database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieve video from database (for future use)
 */
async function getVideoFromDatabase(sessionId) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT session_id, session_name, video_data, file_size, content_type, 
             downloaded_at, os, device, duration, test_status
      FROM browserstack_videos 
      WHERE session_id = $1
    `;
    
    const result = await client.query(query, [sessionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[DB] Error retrieving video from database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get list of all stored sessions with video URLs
 */
async function getStoredSessions(limit = 20) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        session_id, 
        session_name, 
        build_id, 
        video_url,
        public_url,
        dashboard_url,
        os, 
        device, 
        duration, 
        test_status, 
        status,
        downloaded_at,
        CASE 
          WHEN file_size > 0 THEN ROUND(file_size::numeric / 1024 / 1024, 2) 
          ELSE 0 
        END as size_mb
      FROM browserstack_videos 
      ORDER BY downloaded_at DESC 
      LIMIT $1
    `;
    
    const result = await client.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('[DB] Error getting stored sessions:', error);
    throw error;
  } finally {
    client.release();
  }
}
async function getDatabaseStats() {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        COUNT(*) as total_videos,
        ROUND(SUM(file_size)::numeric / 1024 / 1024, 2) as total_size_mb,
        ROUND(AVG(file_size)::numeric / 1024 / 1024, 2) as avg_size_mb,
        MIN(downloaded_at) as first_download,
        MAX(downloaded_at) as latest_download
      FROM browserstack_videos
    `;
    
    const result = await client.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('[DB] Error getting database stats:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main function to process BrowserStack session and store metadata + video URL
 */
async function processBrowserStackSession(latestSession, buildId) {
  try {
    console.log(`[Video] Processing session: ${latestSession.hashed_id}`);
    
    // Initialize database
    await initializeDatabase();
    
    if (!latestSession.video_url) {
      console.log('[Video] No video URL available for this session');
      return {
        success: false,
        error: 'No video URL available'
      };
    }
    
    const sessionData = {
      session_id: latestSession.hashed_id,
      name: latestSession.name,
      build_id: buildId,
      video_url: latestSession.video_url,
      os: latestSession.os,
      os_version: latestSession.os_version,
      device: latestSession.device,
      duration: latestSession.duration,
      status: latestSession.status,
      public_url: latestSession.public_url,
      dashboard_url: `https://app-automate.browserstack.com/dashboard/v2/sessions/${latestSession.hashed_id}`
    };
    
    // Check if session already exists
    const existingSession = await getVideoFromDatabase(sessionData.session_id);
    if (existingSession) {
      console.log(`[Video] Session already exists for ${sessionData.session_id}`);
      return {
        success: true,
        message: 'Session already exists in database',
        existing: true,
        dbId: existingSession.id
      };
    }
    
    // Store session metadata and video URL (but not video content)
    console.log('[Video] Storing session metadata and video URL...');
    const dbResult = await storeSessionMetadata(sessionData);
    
    console.log(`[Video] Session stored successfully with video URL for external access`);
    
    return {
      success: true,
      message: 'Session metadata and video URL stored successfully',
      dbId: dbResult.id,
      videoUrl: sessionData.video_url,
      note: 'Video URL stored for browser-based access. BrowserStack videos require browser download due to AWS S3 restrictions.'
    };
    
  } catch (error) {
    console.error('[Video] Error processing session:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Video] Shutting down gracefully...');
  await pool.end();
});

module.exports = {
  processBrowserStackSession,
  getVideoFromDatabase,
  getStoredSessions,
  getDatabaseStats,
  initializeDatabase,
  testDatabaseConnection,
  storeSessionMetadata
};

