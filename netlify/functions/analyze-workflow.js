const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { 
      nodes = [], 
      edges = [], 
      conversationHistory = [], 
      workflowStats = {} 
    } = JSON.parse(event.body);

    if (!nodes || nodes.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Workflow nodes are required for analysis' }),
      };
    }

    // Initialize Google AI
    const apiKey = process.env.GOOGLE_AI_API_KEY || 'AIzaSyAK4uzxpjBqprcdWp_o2H8He2oVW9pHPzg';
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Google AI API key not configured' }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash-preview-05-20' });

    // Build workflow context
    const workflowContext = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      decisionPoints: nodes.filter(node => 
        node.data.label.includes('?') || 
        node.data.label.toLowerCase().includes('decision') ||
        node.data.label.toLowerCase().includes('approve') ||
        node.data.label.toLowerCase().includes('review')
      ).length,
      processSteps: nodes.filter(node => 
        node.type === 'default' && 
        !node.data.label.includes('?') &&
        !node.data.label.toLowerCase().includes('decision')
      ).length,
      startNodes: nodes.filter(node => node.type === 'input').length,
      endNodes: nodes.filter(node => node.type === 'output').length
    };

    // Build conversation context for industry understanding
    const conversationContext = conversationHistory
      .slice(-10)
      .map(msg => `${msg.sender}: ${msg.text}`)
      .join('\n');

    // Industry patterns for enhanced analysis
    const industryPatterns = {
      'ecommerce': {
        patterns: ['order', 'customer', 'payment', 'shipping', 'inventory'],
        commonIssues: ['payment failures', 'inventory sync', 'shipping delays', 'customer communication'],
        automationAreas: ['inventory updates', 'payment processing', 'shipping notifications', 'customer support']
      },
      'healthcare': {
        patterns: ['patient', 'appointment', 'medical', 'diagnosis', 'treatment'],
        commonIssues: ['appointment scheduling', 'patient communication', 'record keeping', 'compliance'],
        automationAreas: ['appointment reminders', 'record updates', 'prescription processing', 'insurance verification']
      },
      'manufacturing': {
        patterns: ['production', 'quality', 'assembly', 'materials', 'inspection'],
        commonIssues: ['quality control', 'material shortages', 'production bottlenecks', 'equipment downtime'],
        automationAreas: ['quality monitoring', 'inventory management', 'production scheduling', 'maintenance alerts']
      },
      'finance': {
        patterns: ['transaction', 'approval', 'compliance', 'audit', 'risk'],
        commonIssues: ['manual approvals', 'compliance tracking', 'risk assessment', 'audit preparation'],
        automationAreas: ['transaction monitoring', 'compliance checks', 'risk scoring', 'report generation']
      },
      'hr': {
        patterns: ['employee', 'hiring', 'onboarding', 'performance', 'payroll'],
        commonIssues: ['manual onboarding', 'performance tracking', 'leave management', 'compliance'],
        automationAreas: ['onboarding workflows', 'performance reviews', 'leave approvals', 'payroll processing']
      },
      'general': {
        patterns: ['process', 'workflow', 'task', 'approval', 'review'],
        commonIssues: ['manual processes', 'communication gaps', 'approval delays', 'data inconsistency'],
        automationAreas: ['task automation', 'notification systems', 'data synchronization', 'report generation']
      }
    };

    // Detect industry from workflow and conversation
    const detectIndustry = (nodes, conversation) => {
      const allText = (nodes.map(n => n.data.label).join(' ') + ' ' + conversation).toLowerCase();
      let bestMatch = 'general';
      let maxScore = 0;
      
      for (const [industry, data] of Object.entries(industryPatterns)) {
        if (industry === 'general') continue;
        const score = data.patterns.filter(pattern => allText.includes(pattern)).length;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = industry;
        }
      }
      return { industry: bestMatch, confidence: maxScore };
    };

    const industryDetection = detectIndustry(nodes, conversationContext);
    const industryData = industryPatterns[industryDetection.industry] || industryPatterns['general'];

    // Construct the analysis prompt  
    const analysisPrompt = `
You are an expert business process analyst and automation consultant. Analyze the provided workflow and provide actionable improvement recommendations.

WORKFLOW TO ANALYZE:
Industry Context: ${industryDetection.industry} (confidence: ${industryDetection.confidence})
Conversation History: ${conversationContext}

Workflow Structure:
- Total Steps: ${workflowContext.nodeCount}
- Decision Points: ${workflowContext.decisionPoints}
- Process Steps: ${workflowContext.processSteps}

Workflow Nodes:
${nodes.map((node, index) => `${index + 1}. [${node.type}] ${node.data.label} (ID: ${node.id})`).join('\n')}

Workflow Connections:
${edges.map((edge, index) => `${index + 1}. ${edge.source} → ${edge.target}${edge.label ? ` (${edge.label})` : ''}`).join('\n')}

ANALYSIS FRAMEWORK:
1. WEAK POINTS ANALYSIS - Identify bottlenecks, manual processes, missing error handling
2. REPETITIVE PROCESSES - Find duplicate or redundant steps that could be consolidated
3. AUTOMATION OPPORTUNITIES - Rule-based decisions, data processing, AI agent integration points

Based on ${industryDetection.industry} industry best practices:
- Common issues: ${industryData.commonIssues.join(', ')}
- Automation areas: ${industryData.automationAreas.join(', ')}

REQUIRED OUTPUT FORMAT:
Return a JSON object with this exact structure:

{
  "analysisResult": {
    "overallScore": 75,
    "industryContext": {
      "detectedIndustry": "${industryDetection.industry}",
      "confidence": ${industryDetection.confidence},
      "industrySpecificInsights": "Industry-specific observations and recommendations"
    },
    "weakPoints": [
      {
        "id": "weakness-1",
        "type": "bottleneck",
        "nodeId": "relevant-node-id",
        "title": "Manual approval process",
        "description": "Detailed description of the weakness",
        "impact": "high",
        "improvementSuggestion": "Specific suggestion for improvement"
      }
    ],
    "repetitiveProcesses": [
      {
        "id": "repetition-1",
        "type": "duplicate-validation",
        "nodeIds": ["node-1", "node-2"],
        "title": "Duplicate data validation",
        "description": "Description of the repetitive process",
        "consolidationOpportunity": "How to consolidate or eliminate repetition"
      }
    ],
    "automationOpportunities": [
      {
        "id": "automation-1",
        "type": "ai-agent",
        "nodeId": "relevant-node-id",
        "title": "AI-powered document processing",
        "description": "Detailed description of automation opportunity",
        "aiAgentType": "document-processor",
        "implementationComplexity": "medium",
        "expectedBenefit": "Specific expected benefits",
        "estimatedTimeSaving": "70%"
      }
    ],
    "improvementMetrics": {
      "potentialTimeSaving": "45%",
      "errorReductionPotential": "60%",
      "automationCoverage": "40%",
      "processEfficiencyGain": "55%"
    },
    "prioritizedRecommendations": [
      {
        "priority": "high",
        "category": "automation",
        "title": "Implement AI document processing",
        "description": "Replace manual document review with AI agent",
        "impact": "Reduce processing time by 70% and improve accuracy",
        "effort": "medium"
      }
    ]
  }
}

Provide specific, actionable recommendations. Use actual node IDs from the provided workflow. Include AI agent types like: document-processor, customer-support, data-analyzer, workflow-orchestrator.

Respond ONLY with the JSON object, no additional text or markdown formatting.
`;

    console.log('Calling Google AI for workflow analysis');
    
    // Call Google AI API
    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('AI Analysis response received, length:', text.length);

    // Parse the AI response
    let analysisData;
    try {
      // Clean the response - remove any markdown formatting and extra whitespace
      let cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to extract JSON if it's wrapped in other text
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
      
      const parsedResponse = JSON.parse(cleanedText);
      
      // Check if the response already has the analysisResult wrapper
      if (parsedResponse.analysisResult) {
        analysisData = parsedResponse;
      } else {
        // If not, wrap it in the expected structure
        analysisData = { analysisResult: parsedResponse };
      }
    } catch (parseError) {
      console.error('Failed to parse AI analysis response:', parseError);
      console.error('Raw AI response:', text);
      
      // Fallback analysis based on basic workflow structure
      analysisData = {
        analysisResult: {
          overallScore: 70,
          industryContext: {
            detectedIndustry: industryDetection.industry,
            confidence: industryDetection.confidence,
            industrySpecificInsights: `Based on ${industryDetection.industry} industry patterns, this workflow could benefit from automation and streamlining.`
          },
          weakPoints: [
            {
              id: "weakness-1",
              type: "manual-process",
              nodeId: nodes.find(n => n.data.label.toLowerCase().includes('review') || n.data.label.toLowerCase().includes('approve'))?.id || nodes[0]?.id,
              title: "Manual processing steps",
              description: "Several steps in the workflow require manual intervention which could cause delays",
              impact: "medium",
              improvementSuggestion: "Consider automating routine decisions and implementing approval thresholds"
            }
          ],
          repetitiveProcesses: [],
          automationOpportunities: [
            {
              id: "automation-1",
              type: "ai-agent",
              nodeId: nodes[Math.floor(nodes.length / 2)]?.id || nodes[0]?.id,
              title: "Process automation opportunity",
              description: "This step could be enhanced with AI-powered automation",
              aiAgentType: "workflow-orchestrator",
              implementationComplexity: "medium",
              expectedBenefit: "Reduced processing time and improved consistency",
              estimatedTimeSaving: "30%"
            }
          ],
          improvementMetrics: {
            potentialTimeSaving: "35%",
            errorReductionPotential: "45%",
            automationCoverage: "25%",
            processEfficiencyGain: "40%"
          },
          prioritizedRecommendations: [
            {
              priority: "high",
              category: "automation",
              title: "Implement workflow automation",
              description: "Add AI agents to handle routine tasks and decision-making",
              impact: "Improve efficiency and reduce manual errors",
              effort: "medium"
            }
          ]
        }
      };
    }

    // Validate and enhance the response structure
    if (!analysisData.analysisResult) {
      analysisData.analysisResult = {};
    }
    
    // Ensure all required fields are present
    const requiredFields = ['overallScore', 'industryContext', 'weakPoints', 'repetitiveProcesses', 'automationOpportunities', 'improvementMetrics', 'prioritizedRecommendations'];
    requiredFields.forEach(field => {
      if (!analysisData.analysisResult[field]) {
        analysisData.analysisResult[field] = field.includes('Points') || field.includes('Processes') || field.includes('Opportunities') || field.includes('Recommendations') ? [] : {};
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysisData),
    };

  } catch (error) {
    console.error('Error in analyze-workflow function:', error);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);

    let errorMessage = 'Internal server error';
    if (error.message) {
      errorMessage = `Google AI API Error: ${error.message}`;
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message,
        code: error.code || 'UNKNOWN'
      }),
    };
  }
};
