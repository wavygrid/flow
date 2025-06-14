const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  // Set long timeout for background processing
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('Background workflow processing started');

  try {
    // Parse the job data from the request
    const {
      jobId,
      userPrompt,
      currentNodes = [],
      currentEdges = [],
      conversationHistory = [],
      questionCount = 0
    } = JSON.parse(event.body);

    if (!jobId || !userPrompt) {
      console.error('Missing required parameters:', { jobId: !!jobId, userPrompt: !!userPrompt });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    console.log(`Processing job ${jobId}`);

    // Initialize Google AI
    const apiKey = process.env.GOOGLE_AI_API_KEY || 'AIzaSyAK4uzxpjBqprcdWp_o2H8He2oVW9pHPzg';
    if (!apiKey) {
      console.error('Google AI API key not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Google AI API key not configured' })
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    // Build context from conversation history
    const conversationContext = conversationHistory
      .slice(-10)
      .map(msg => `${msg.sender}: ${msg.text}`)
      .join('\n');

    // Determine if we should ask follow-up questions or provide final workflow
    const isLastQuestion = questionCount >= 4;
    
    // Enhanced industry knowledge base
    const industryPatterns = {
      'ecommerce': ['order', 'customer', 'payment', 'shipping', 'inventory', 'cart', 'checkout', 'product'],
      'healthcare': ['patient', 'appointment', 'medical', 'diagnosis', 'treatment', 'insurance', 'prescription'],
      'manufacturing': ['production', 'quality', 'assembly', 'materials', 'inspection', 'packaging', 'delivery'],
      'finance': ['transaction', 'approval', 'compliance', 'audit', 'risk', 'account', 'payment', 'verification'],
      'hr': ['employee', 'hiring', 'onboarding', 'performance', 'payroll', 'leave', 'training'],
      'marketing': ['campaign', 'lead', 'conversion', 'content', 'social media', 'analytics', 'roi'],
      'education': ['student', 'course', 'assessment', 'grading', 'enrollment', 'curriculum'],
      'support': ['ticket', 'issue', 'resolution', 'escalation', 'customer service', 'feedback'],
      'sales': ['prospect', 'quote', 'proposal', 'negotiation', 'contract', 'closing', 'follow-up'],
      'logistics': ['warehouse', 'shipping', 'tracking', 'delivery', 'inventory', 'distribution']
    };

    // Detect industry from user input
    const detectIndustry = (text) => {
      const lowerText = text.toLowerCase();
      let bestMatch = 'general';
      let maxScore = 0;
      
      for (const [industry, keywords] of Object.entries(industryPatterns)) {
        const score = keywords.filter(keyword => lowerText.includes(keyword)).length;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = industry;
        }
      }
      return { industry: bestMatch, confidence: maxScore };
    };

    const industryDetection = detectIndustry(userPrompt + ' ' + conversationContext);
    
    // Create the master prompt for Google AI
    const masterPrompt = `You are an expert business process analyst specializing in ${industryDetection.industry} workflows. Create a detailed, realistic workflow for: "${userPrompt}"

Context: ${conversationContext}
Question ${questionCount + 1}/5

Return ONLY a JSON object with this exact structure:
{
  "nodes": [
    {"id": "unique_id", "type": "input|default|output", "position": {"x": number, "y": number}, "data": {"label": "descriptive label"}, "style": {"background": "color", "color": "text_color", "border": "border_style", "borderRadius": "12px", "padding": "12px"}}
  ],
  "edges": [
    {"id": "unique_edge_id", "source": "source_node_id", "target": "target_node_id", "type": "smoothstep", "animated": true, "style": {"stroke": "color", "strokeWidth": 3}, "label": "optional_label"}
  ],
  "followUpQuestion": ${isLastQuestion ? 'null' : '"What specific question to ask next?"'}
}

STYLING RULES:
- Start nodes: {"background": "#e8f5e8", "color": "#2d5a2d", "border": "2px solid #4caf50", "borderRadius": "12px", "padding": "12px"}
- Process nodes: {"background": "#e3f2fd", "color": "#1565c0", "border": "2px solid #2196f3", "borderRadius": "12px", "padding": "12px"}
- Decision nodes: {"background": "#fff8e1", "color": "#ef6c00", "border": "2px solid #ef6c00", "borderRadius": "12px", "padding": "12px"}
- End nodes: {"background": "#ffebee", "color": "#c62828", "border": "2px solid #f44336", "borderRadius": "12px", "padding": "12px"}

POSITIONING: Space nodes vertically (y: 50, 150, 250, etc.) and use x positioning for parallel processes.

Create a ${isLastQuestion ? 'comprehensive final' : 'initial'} workflow with ${isLastQuestion ? '8-12 nodes including decision points and parallel processes' : '4-6 core nodes'}.

No additional text, just the JSON object.`;

    console.log(`Calling Google AI for job ${jobId}`);
    
    // Call Google AI API
    const startTime = Date.now();
    const result = await model.generateContent(masterPrompt);
    const response = await result.response;
    const text = response.text();
    const endTime = Date.now();
    
    console.log(`AI Response received for job ${jobId} in ${endTime - startTime}ms`);

    // Parse the AI response
    let workflowData;
    try {
      let cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
      
      workflowData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback workflow
      workflowData = {
        nodes: [
          {
            id: 'start',
            type: 'input',
            position: { x: 250, y: 50 },
            data: { label: 'Process Start' },
            style: { background: '#e8f5e8', color: '#2d5a2d', border: '2px solid #4caf50', borderRadius: '12px', padding: '12px' }
          },
          {
            id: 'end',
            type: 'output',
            position: { x: 250, y: 150 },
            data: { label: 'Process Complete' },
            style: { background: '#ffebee', color: '#c62828', border: '2px solid #f44336', borderRadius: '12px', padding: '12px' }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start',
            target: 'end',
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#2196f3', strokeWidth: 3 }
          }
        ],
        followUpQuestion: questionCount < 4 ? 'What specific steps are involved in this process?' : null
      };
    }

    // Validate response structure
    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      workflowData.nodes = [];
    }
    if (!workflowData.edges || !Array.isArray(workflowData.edges)) {
      workflowData.edges = [];
    }

    console.log(`Job ${jobId} completed successfully`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        jobId,
        result: workflowData,
        message: 'Workflow processing completed'
      })
    };

  } catch (error) {
    console.error('Error in background workflow processing:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Background processing failed',
        details: error.message
      })
    };
  }
}; 