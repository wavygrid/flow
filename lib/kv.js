// KV Store functionality
// Note: In development, we'll use a simple in-memory store
// In production, this would use Netlify's KV API

// Make memory store global to persist across API calls
global.memoryStore = global.memoryStore || new Map();
let memoryStore = global.memoryStore;

export const jobsStore = {
  async get(key) {
    if (process.env.NODE_ENV === 'production') {
      // In production, this would use Netlify KV API
      console.log(`KV GET: ${key}`);
      return memoryStore.get(key) || null;
    } else {
      // Development fallback
      return memoryStore.get(key) || null;
    }
  },

  async set(key, value) {
    if (process.env.NODE_ENV === 'production') {
      // In production, this would use Netlify KV API
      console.log(`KV SET: ${key}`);
      memoryStore.set(key, value);
    } else {
      // Development fallback
      memoryStore.set(key, value);
    }
  }
};

// Utility functions for job management
export const jobUtils = {
  // Create a new job entry
  async createJob(jobId, data) {
    const jobData = {
      id: jobId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    
    await jobsStore.set(jobId, JSON.stringify(jobData));
    return jobData;
  },

  // Update job status
  async updateJobStatus(jobId, status, data = {}) {
    const existing = await this.getJob(jobId);
    if (!existing) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      ...data
    };

    await jobsStore.set(jobId, JSON.stringify(updatedJob));
    return updatedJob;
  },

  // Get job by ID
  async getJob(jobId) {
    try {
      const jobData = await jobsStore.get(jobId);
      return jobData ? JSON.parse(jobData) : null;
    } catch (error) {
      console.error('Error retrieving job:', error);
      return null;
    }
  },

  // Mark job as completed with result
  async completeJob(jobId, result) {
    return await this.updateJobStatus(jobId, 'completed', { result });
  },

  // Mark job as failed with error
  async failJob(jobId, error) {
    return await this.updateJobStatus(jobId, 'failed', { 
      error: error.message || error.toString(),
      errorDetails: error.stack || ''
    });
  },

  // Clean up old jobs (optional - can be called periodically)
  async cleanupOldJobs(olderThanHours = 24) {
    // This would require listing all keys, which might be expensive
    // Implement if needed for production cleanup
    console.log(`Cleanup would remove jobs older than ${olderThanHours} hours`);
  }
};

export default jobsStore; 