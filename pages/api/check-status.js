import { jobUtils } from '../../lib/kv.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get jobId from query parameters
    const { jobId } = req.query;

    if (!jobId) {
      res.status(400).json({ error: 'jobId is required' });
      return;
    }

    // Retrieve job data from KV store
    const jobData = await jobUtils.getJob(jobId);

    if (!jobData) {
      res.status(404).json({ 
        error: 'Job not found',
        jobId,
        message: 'The job may have expired or never existed. Please start a new analysis.'
      });
      return;
    }

    // Calculate runtime for status information
    const createdAt = new Date(jobData.createdAt);
    const now = new Date();
    const runtimeSeconds = Math.floor((now - createdAt) / 1000);

    // Prepare response based on job status
    const response = {
      jobId,
      status: jobData.status,
      createdAt: jobData.createdAt,
      updatedAt: jobData.updatedAt,
      runtimeSeconds
    };

    // Add status-specific data
    switch (jobData.status) {
      case 'pending':
        response.message = 'Job is queued and waiting to be processed...';
        response.estimatedTimeRemaining = '30-120 seconds';
        break;

      case 'processing':
        response.message = 'Analyzing your workflow with Google AI...';
        response.estimatedTimeRemaining = `${Math.max(0, 90 - runtimeSeconds)} seconds`;
        break;

      case 'completed':
        response.message = 'Analysis completed successfully!';
        response.result = jobData.result;
        break;

      case 'failed':
        response.message = 'Analysis failed. Please try again.';
        response.error = jobData.error;
        response.errorDetails = jobData.errorDetails;
        break;

      default:
        response.message = 'Unknown job status';
        break;
    }

    // Return appropriate HTTP status
    const httpStatus = jobData.status === 'failed' ? 500 : 200;
    res.status(httpStatus).json(response);

  } catch (error) {
    console.error('Error in check-status API:', error);
    res.status(500).json({ 
      error: 'Failed to check job status',
      details: error.message
    });
  }
} 