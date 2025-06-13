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
    const { userPrompt, currentNodes = [], currentEdges = [], conversationHistory = [], questionCount = 0 } = JSON.parse(event.body);

    if (!userPrompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userPrompt is required' }),
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

    // Build context from conversation history
    const conversationContext = conversationHistory
      .slice(-10) // Keep last 10 messages for better context
      .map(msg => `${msg.sender}: ${msg.text}`)
      .join('\n');

    // Determine if we should ask follow-up questions or provide final workflow
    const isLastQuestion = questionCount >= 4; // 5th question (0-based index)
    
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
    
    // Construct the enhanced master prompt for Google AI
    const masterPrompt = `
You are an expert business process analyst with deep knowledge across all industries. Your task is to analyze the user's business process and create realistic, industry-specific workflows.

CONTEXT:
Previous conversation:
${conversationContext}

Current workflow state:
- Existing nodes: ${currentNodes.length} nodes
- Existing edges: ${currentEdges.length} connections
- Question count: ${questionCount} (limit: 5 questions)
- Detected industry: ${industryDetection.industry}
- Industry confidence: ${industryDetection.confidence}

USER'S NEW INPUT: "${userPrompt}"

ENHANCED INSTRUCTIONS:
1. Create REALISTIC workflows based on industry best practices and common patterns
2. For ${industryDetection.industry} industry, incorporate standard processes, compliance requirements, and typical stakeholders
3. Generate multiple workflow scenarios/options and present the most appropriate one
4. Ask INTELLIGENT questions that reveal critical process details, edge cases, and business rules
5. Consider scalability, automation opportunities, and potential bottlenecks

${isLastQuestion ? 
  `FINAL WORKFLOW GENERATION:
- This is the 5th question - create the MOST COMPREHENSIVE and REALISTIC workflow possible
- Include all decision points, parallel processes, exception handling, and feedback loops
- Set "followUpQuestion" to null
- Consider industry-specific compliance, approvals, and quality gates
- Add realistic timing, responsibilities, and system integrations where applicable` :
  `INTELLIGENT QUESTIONING PHASE (Question ${questionCount + 1}/5):
- Generate 2-3 possible workflow scenarios based on the information gathered
- Present the most likely scenario in your workflow response
- Ask ONE strategic question that will help determine:
  * Critical decision points or business rules
  * Exception handling scenarios
  * Integration points with other systems
  * Approval processes or compliance requirements
  * Volume/scale considerations
  * Success metrics or quality gates
- Frame questions to reveal realistic business constraints and requirements`
}

REALISTIC WORKFLOW REQUIREMENTS:
- Include realistic decision points (Yes/No branches, multiple options)
- Add exception handling and error states
- Consider approval workflows where appropriate
- Include system integrations (CRM, ERP, databases, APIs)
- Add quality checkpoints and validation steps
- Consider parallel processes where applicable
- Include realistic stakeholders and handoffs
- Add time-sensitive steps and SLA considerations

REACT FLOW FORMAT REQUIREMENTS:
- nodes: Array with { id, type, position: {x, y}, data: {label}, style: {background, color, border, borderRadius, padding} }
- edges: Array with { id, source, target, type, animated, style: {stroke, strokeWidth}, label? }
- Node types: 'input' (start), 'default' (process), 'output' (end)
- Position nodes in logical flow (top-to-bottom, left-to-right)
- Use descriptive, actionable labels
- Apply consistent, professional styling

ENHANCED STYLING GUIDELINES:
- Start/trigger nodes: #e8f5e8 (light green) with #2d5a2d text
- Process nodes: #e3f2fd (light blue) with #1565c0 text
- Decision nodes: #fff8e1 (light amber) with #ef6c00 text
- System/Integration nodes: #f3e5f5 (light purple) with #7b1fa2 text
- End nodes: #ffebee (light red) with #c62828 text
- Exception nodes: #fbe9e7 (light orange) with #d84315 text
- Use smoothstep edges with appropriate colors
- Add edge labels for decision branches ("Yes", "No", "Approved", etc.)

EXAMPLE ENHANCED OUTPUT:
{
  "nodes": [
    {
      "id": "start",
      "type": "input", 
      "position": {"x": 250, "y": 50},
      "data": {"label": "Customer Places Order"},
      "style": {"background": "#e8f5e8", "color": "#2d5a2d", "border": "2px solid #4caf50", "borderRadius": "12px", "padding": "12px", "fontWeight": "600"}
    },
    {
      "id": "validate",
      "type": "default",
      "position": {"x": 250, "y": 150}, 
      "data": {"label": "Validate Payment & Inventory"},
      "style": {"background": "#e3f2fd", "color": "#1565c0", "border": "2px solid #2196f3", "borderRadius": "12px", "padding": "12px", "fontWeight": "500"}
    },
    {
      "id": "decision",
      "type": "default",
      "position": {"x": 250, "y": 250},
      "data": {"label": "Validation Successful?"},
      "style": {"background": "#fff8e1", "color": "#ef6c00", "border": "2px solid #ff9800", "borderRadius": "12px", "padding": "12px", "fontWeight": "500"}
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "validate", 
      "type": "smoothstep",
      "animated": true,
      "style": {"stroke": "#2196f3", "strokeWidth": 3}
    },
    {
      "id": "e2",
      "source": "validate",
      "target": "decision",
      "type": "smoothstep", 
      "animated": true,
      "style": {"stroke": "#2196f3", "strokeWidth": 3}
    }
  ],
  "followUpQuestion": ${isLastQuestion ? '""' : '"Based on your industry requirements, what happens when payment validation fails? Do you have an automated retry system, manual review process, or immediate order cancellation?"'}
}

${!isLastQuestion ? `
WORKFLOW SCENARIO CONSIDERATION:
Based on the current information, consider these potential workflow variations:
1. High-volume automated process with minimal human intervention
2. Approval-heavy process with multiple stakeholders
3. Exception-heavy process requiring significant error handling

Choose the most appropriate scenario and ask a question to validate or refine this choice.
` : ''}

Respond ONLY with the JSON object, no additional text or markdown formatting.
`;

    console.log('Calling Google AI with enhanced industry-aware prompt');
    
    // Call Google AI API
    const result = await model.generateContent(masterPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('AI Response received, length:', text.length);

    // Parse the AI response
    let workflowData;
    try {
      // Clean the response - remove any markdown formatting and extra whitespace
      let cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to extract JSON if it's wrapped in other text
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
      
      workflowData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI response:', text);
      
      // Enhanced fallback response based on detected industry
      const industryFallbacks = {
        'ecommerce': {
          title: 'E-commerce Order Process',
          steps: ['Order Received', 'Payment Validation', 'Inventory Check', 'Fulfillment', 'Shipping'],
          question: 'What payment methods do you accept, and do you have automated inventory management?'
        },
        'healthcare': {
          title: 'Patient Care Workflow', 
          steps: ['Patient Registration', 'Medical Assessment', 'Treatment Plan', 'Care Delivery', 'Follow-up'],
          question: 'What type of medical practice is this for, and do you have electronic health records integration?'
        },
        'default': {
          title: 'Business Process',
          steps: ['Process Start', 'Input Processing', 'Decision Point', 'Action Taken', 'Process Complete'],
          question: 'What industry or type of business process are you looking to map out?'
        }
      };

      const fallback = industryFallbacks[industryDetection.industry] || industryFallbacks['default'];
      
      workflowData = {
        nodes: fallback.steps.map((step, index) => ({
          id: `node-${index + 1}`,
          type: index === 0 ? 'input' : index === fallback.steps.length - 1 ? 'output' : 'default',
          position: { x: 250, y: 80 + (index * 120) },
          data: { label: step },
          style: { 
            background: index === 0 ? '#e8f5e8' : index === fallback.steps.length - 1 ? '#ffebee' : '#e3f2fd',
            color: index === 0 ? '#2d5a2d' : index === fallback.steps.length - 1 ? '#c62828' : '#1565c0',
            border: `2px solid ${index === 0 ? '#4caf50' : index === fallback.steps.length - 1 ? '#f44336' : '#2196f3'}`,
            borderRadius: '12px',
            padding: '12px',
            fontWeight: '500'
          }
        })),
        edges: fallback.steps.slice(0, -1).map((_, index) => ({
          id: `edge-${index + 1}`,
          source: `node-${index + 1}`,
          target: `node-${index + 2}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#2196f3', strokeWidth: 3 }
        })),
        followUpQuestion: questionCount < 4 ? fallback.question : null
      };
    }

    // Validate and enhance the response structure
    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      workflowData.nodes = [];
    }
    if (!workflowData.edges || !Array.isArray(workflowData.edges)) {
      workflowData.edges = [];
    }
    
    // Handle follow-up question based on question count
    if (questionCount >= 4) {
      // At question limit - no more follow-up questions
      workflowData.followUpQuestion = null;
    } else if (!workflowData.followUpQuestion) {
      // Generate industry-specific intelligent question
      const intelligentQuestions = {
        'ecommerce': [
          'How do you handle inventory shortages - backorders, substitutions, or immediate cancellation?',
          'What approval process do you have for high-value orders or suspicious transactions?',
          'How do you manage returns and refunds in your current process?'
        ],
        'healthcare': [
          'What patient consent and privacy protocols must be followed in this workflow?',
          'How do you handle emergency situations or urgent cases in this process?',
          'What documentation and compliance requirements need to be included?'
        ],
        'manufacturing': [
          'What quality control checkpoints are required at each stage?', 
          'How do you handle defects or failures during the production process?',
          'What regulatory compliance or safety protocols must be followed?'
        ],
        'default': [
          'What happens when this process encounters an exception or error?',
          'Who are the key stakeholders that need to approve or review steps?',
          'What systems or tools are currently used in this process?'
        ]
      };
      
      const questions = intelligentQuestions[industryDetection.industry] || intelligentQuestions['default'];
      workflowData.followUpQuestion = questions[questionCount % questions.length];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(workflowData),
    };

  } catch (error) {
    console.error('Error in generate-workflow function:', error);
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