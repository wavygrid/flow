import { v4 as uuidv4 } from 'uuid';
import { jobUtils } from '../../lib/kv.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Parse and validate request body
    const { 
      userPrompt, 
      currentNodes = [], 
      currentEdges = [], 
      conversationHistory = [], 
      questionCount = 0 
    } = req.body;

    if (!userPrompt || !userPrompt.trim()) {
      res.status(400).json({ error: 'userPrompt is required' });
      return;
    }

    // Generate unique job ID
    const jobId = uuidv4();

    // Store initial job data in KV
    const jobData = await jobUtils.createJob(jobId, {
      userPrompt: userPrompt.trim(),
      currentNodes,
      currentEdges,
      conversationHistory,
      questionCount,
      type: 'workflow-generation'
    });

    console.log(`Created job ${jobId} for workflow generation`);

    // Trigger background processing
    // In development, we'll import and call the background function directly
    // In production, this would be handled by Netlify automatically
    try {
      // Import the background processing function
      const backgroundHandler = require('../../netlify/functions/process-workflow.js');
      
      // Trigger background processing asynchronously (don't wait for completion)
      setImmediate(async () => {
        try {
          console.log(`Triggering background processing for job ${jobId}`);
          
          // Update status to processing
          await jobUtils.updateJobStatus(jobId, 'processing');
          
          // Call the background function
          const mockEvent = {
            body: JSON.stringify({
              jobId,
              userPrompt: userPrompt.trim(),
              currentNodes,
              currentEdges,
              conversationHistory,
              questionCount
            })
          };
          
          const mockContext = {
            callbackWaitsForEmptyEventLoop: false
          };
          
          const result = await backgroundHandler.handler(mockEvent, mockContext);
          
          // Update job status based on result
          if (result.statusCode === 200) {
            const resultData = JSON.parse(result.body);
            await jobUtils.completeJob(jobId, resultData.result);
            console.log(`Job ${jobId} completed successfully`);
          } else {
            const errorData = JSON.parse(result.body);
            await jobUtils.failJob(jobId, new Error(errorData.error || 'Background processing failed'));
            console.log(`Job ${jobId} failed:`, errorData.error);
          }
          
        } catch (backgroundError) {
          console.error(`Background processing failed for job ${jobId}:`, backgroundError);
          await jobUtils.failJob(jobId, backgroundError);
        }
      });
      
    } catch (triggerError) {
      console.error('Failed to trigger background processing:', triggerError);
      // Mark job as failed if we can't trigger background processing
      await jobUtils.failJob(jobId, triggerError);
    }

    // Return immediately with job info (202 Accepted)
    res.status(202).json({
      jobId,
      status: 'pending',
      message: 'Workflow analysis started. Use the jobId to check status.',
      estimatedTime: '30-120 seconds'
    });

  } catch (error) {
    console.error('Error in start-analysis API:', error);
    res.status(500).json({ 
      error: 'Failed to start workflow analysis',
      details: error.message
    });
  }
} 