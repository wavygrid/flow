import { useState, useEffect } from 'react';
import axios from 'axios';
import WorkflowDiagram from '../components/WorkflowDiagram';
import ChatInterface from '../components/ChatInterface';
import Head from 'next/head';

export default function Home() {
  // Application state
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [questionCount, setQuestionCount] = useState(0); // Track AI questions
  const [conversation, setConversation] = useState([
    {
      sender: 'ai',
      text: 'Hello! I\'m your AI Workflow Analyst. I specialize in creating realistic, industry-specific workflow diagrams by understanding your business processes deeply.\n\nI\'ll automatically detect your industry and ask up to 5 intelligent questions to gather all the critical details needed for an accurate workflow. Just describe your business process to get started!'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowStats, setWorkflowStats] = useState({
    totalProcesses: 0,
    decisionPoints: 0,
    automationOpportunities: 0
  });

  // Phase 1: Analysis state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Phase 2: Optimization state
  const [optimizedWorkflow, setOptimizedWorkflow] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizedWorkflow, setShowOptimizedWorkflow] = useState(false);
  const [workflowMode, setWorkflowMode] = useState('original'); // 'original' | 'optimized' | 'comparison'
  const [optimizationSummary, setOptimizationSummary] = useState(null);

  // Enhanced message handling with better user feedback
  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Add user message to conversation
    setConversation(prev => [...prev, { sender: 'user', text: message }]);
    setIsLoading(true);

    try {
      // Call our API endpoint (works for both local dev and production)
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/.netlify/functions/generate-workflow'
        : '/api/generate-workflow';
        
      const response = await axios.post(apiUrl, {
        userPrompt: message,
        currentNodes: nodes,
        currentEdges: edges,
        conversationHistory: conversation,
        questionCount: questionCount // Pass current question count
      });

      const { nodes: newNodes, edges: newEdges, followUpQuestion } = response.data;

      // Debug logging
      console.log('Response received:', { 
        newNodes: newNodes?.length, 
        newEdges: newEdges?.length, 
        followUpQuestion, 
        questionCount 
      });

      // Update state with new workflow data
      if (newNodes && newNodes.length > 0) {
        setNodes(newNodes);
        setEdges(newEdges || []);
        
        // Calculate workflow statistics
        const decisionNodes = newNodes.filter(node => 
          node.data.label.includes('?') || 
          node.data.label.toLowerCase().includes('decision') ||
          node.data.label.toLowerCase().includes('approve')
        );
        
        const processNodes = newNodes.filter(node => 
          node.type === 'default' && 
          !decisionNodes.includes(node)
        );

        setWorkflowStats({
          totalProcesses: processNodes.length,
          decisionPoints: decisionNodes.length,
          automationOpportunities: Math.floor(processNodes.length * 0.3) // Estimate 30% automation potential
        });
      }
      
      // Handle AI response based on question limit
      if (followUpQuestion && questionCount < 4) {
        // Still within question limit - add follow-up question
        console.log('Adding follow-up question:', followUpQuestion);
        setConversation(prev => [...prev, { sender: 'ai', text: followUpQuestion }]);
        setQuestionCount(prev => prev + 1);
      } else if (questionCount >= 4 || !followUpQuestion) {
        // Reached question limit or no more questions - provide final workflow message
        const completionMessage = newNodes && newNodes.length > 0 
          ? `Perfect! I've created your comprehensive workflow diagram with ${newNodes.length} steps and ${newEdges?.length || 0} connections. The diagram includes all the critical processes, decision points, and realistic business flows based on our conversation.\n\n✨ Your workflow is complete and ready for analysis!`
          : 'I\'ve analyzed your process and created a comprehensive workflow diagram. Review the visual representation above to see all the steps, decision points, and connections in your business process.';
          
        console.log('Adding completion message');
        setConversation(prev => [...prev, { 
          sender: 'ai', 
          text: completionMessage
        }]);
        setQuestionCount(5); // Ensure we're at the limit
      } else if (followUpQuestion) {
        // Fallback: just add the question if we have one
        console.log('Fallback: adding question:', followUpQuestion);
        setConversation(prev => [...prev, { sender: 'ai', text: followUpQuestion }]);
        setQuestionCount(prev => prev + 1);
      }

    } catch (error) {
      console.error('Error calling workflow generator:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      let errorMessage = 'I encountered an issue analyzing your process. ';
      if (error.response?.status === 429) {
        errorMessage += 'The AI service is currently busy. Please try again in a moment.';
      } else if (error.response?.status >= 500) {
        errorMessage += 'There\'s a temporary service issue. Please try again.';
      } else {
        errorMessage += 'Please try rephrasing your workflow description or providing more specific details.';
      }
      
      setConversation(prev => [...prev, { 
        sender: 'ai', 
        text: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 1: Analysis function
  const handleAnalyzeWorkflow = async () => {
    if (!nodes || nodes.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      // Call analysis API endpoint
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/.netlify/functions/analyze-workflow'
        : '/api/analyze-workflow';
        
      const response = await axios.post(apiUrl, {
        nodes: nodes,
        edges: edges,
        conversationHistory: conversation,
        workflowStats: workflowStats
      });

      const { analysisResult: result } = response.data;
      setAnalysisResult(result);
      setShowAnalysis(true);
      
      // Add analysis completion message to conversation
      const analysisMessage = `🎯 **Workflow Analysis Complete!**\n\nI've analyzed your workflow and identified ${result.weakPoints?.length || 0} weak points, ${result.automationOpportunities?.length || 0} automation opportunities, and ${result.repetitiveProcesses?.length || 0} areas for improvement.\n\n**Overall Efficiency Score: ${result.overallScore}/100**\n\nClick "View Analysis" to see detailed recommendations for optimizing your workflow with AI automation.`;
      
      setConversation(prev => [...prev, { 
        sender: 'ai', 
        text: analysisMessage
      }]);

    } catch (error) {
      console.error('Error analyzing workflow:', error);
      setConversation(prev => [...prev, { 
        sender: 'ai', 
        text: 'I encountered an issue analyzing your workflow. Please try again in a moment.'
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Phase 2: Optimization function
  const handleOptimizeWorkflow = async () => {
    if (!nodes || nodes.length === 0 || !analysisResult) return;
    
    setIsOptimizing(true);
    try {
      // Call optimization API endpoint
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/.netlify/functions/optimize-workflow'
        : '/api/optimize-workflow';
        
      const response = await axios.post(apiUrl, {
        originalNodes: nodes,
        originalEdges: edges,
        analysisResult: analysisResult,
        conversationHistory: conversation
      });

      const { optimizedWorkflow: optimized, improvements, optimizationSummary: summary } = response.data;
      
      setOptimizedWorkflow(optimized);
      setOptimizationSummary(summary);
      setShowOptimizedWorkflow(true);
      setWorkflowMode('optimized');
      
      // Add optimization completion message to conversation
      const optimizationMessage = `🚀 **Workflow Optimization Complete!**\n\nI've created an optimized version of your workflow with ${improvements?.length || 0} key improvements:\n\n` +
        `📈 **Efficiency Score: ${summary?.originalScore || 70} → ${summary?.optimizedScore || 85}** (+${summary?.overallImprovementPercentage || '15%'})\n\n` +
        `✨ **Key Enhancements:**\n` +
        `• ${summary?.aiAgentsIntegrated || 0} AI agents integrated\n` +
        `• ${summary?.processesStreamlined || 0} processes streamlined\n` +
        `• ${summary?.errorHandlingAdded || 0} error handling improvements\n\n` +
        `Switch between "Original" and "Optimized" views to see the improvements, or use "Comparison" mode to see changes side-by-side!`;
      
      setConversation(prev => [...prev, { 
        sender: 'ai', 
        text: optimizationMessage
      }]);

    } catch (error) {
      console.error('Error optimizing workflow:', error);
      setConversation(prev => [...prev, { 
        sender: 'ai', 
        text: 'I encountered an issue optimizing your workflow. Please try the analysis again first.'
      }]);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Calculate workflow completion percentage
  const getCompletionPercentage = () => {
    if (questionCount >= 5) return 100;
    return Math.round((questionCount / 5) * 100);
  };

  return (
    <>
      <Head>
        <title>AI Workflow Analyst - Create Visual Business Processes</title>
        <meta name="description" content="Transform your business processes into visual workflows using AI. Industry-specific analysis with intelligent questioning." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </Head>

             <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Enhanced Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
          <div className="container flex h-16 items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Workflow Analyst</h1>
                  <p className="text-sm text-gray-600">
                    Industry-smart process visualization
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enhanced Status Bar */}
            <div className="ml-auto flex items-center space-x-6">
              {/* Progress Indicator */}
              {questionCount > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{getCompletionPercentage()}%</span> Complete
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${getCompletionPercentage()}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Workflow Stats */}
              {nodes.length > 0 && (
                <div className="flex items-center space-x-4 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-1 text-sm text-blue-700">
                    <span className="font-semibold">{nodes.length}</span>
                    <span>steps</span>
                  </div>
                  {workflowStats.decisionPoints > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-amber-700">
                      <span className="font-semibold">{workflowStats.decisionPoints}</span>
                      <span>decisions</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                {questionCount >= 5 ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span>Complete</span>
                    </div>
                    {/* Phase 1: Analysis Button */}
                    <button
                      onClick={handleAnalyzeWorkflow}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Analyze Workflow</span>
                        </>
                      )}
                    </button>
                    
                    {/* Phase 2: Optimization Button - appears after analysis */}
                    {analysisResult && (
                      <button
                        onClick={handleOptimizeWorkflow}
                        disabled={isOptimizing}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isOptimizing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Optimizing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Optimize Workflow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    <span>Question {questionCount + 1}/5</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="h-[calc(100vh-120px)] flex gap-6 p-6">
          
          {/* Workflow Diagram - 65% width */}
          <div className="w-[65%] h-full overflow-hidden">
            <div className="card h-full shadow-lg border border-gray-200">
              <div className="card-header flex-shrink-0 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Workflow Diagram</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {nodes.length > 0 
                        ? `Interactive workflow with ${nodes.length} step${nodes.length !== 1 ? 's' : ''} and ${edges.length} connection${edges.length !== 1 ? 's' : ''}`
                        : 'Your AI-generated workflow visualization will appear here'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Phase 2: Workflow Mode Selector */}
                    {optimizedWorkflow && (
                      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setWorkflowMode('original')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                            workflowMode === 'original' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Original
                        </button>
                        <button
                          onClick={() => setWorkflowMode('optimized')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                            workflowMode === 'optimized' 
                              ? 'bg-white text-emerald-600 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Optimized
                        </button>
                        <button
                          onClick={() => setWorkflowMode('comparison')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                            workflowMode === 'comparison' 
                              ? 'bg-white text-purple-600 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Compare
                        </button>
                      </div>
                    )}
                    
                    {nodes.length > 0 && (
                      <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        Zoom & Pan Enabled
                      </div>
                    )}
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-content flex-1 min-h-0 bg-gray-50">
                <div className="h-full w-full">
                  {workflowMode === 'comparison' && optimizedWorkflow ? (
                    // Phase 2: Comparison view - side by side
                    <div className="h-full flex gap-2">
                      <div className="flex-1 border border-gray-300 rounded-lg bg-white">
                        <div className="text-center py-2 bg-blue-50 text-blue-700 text-sm font-medium border-b">
                          Original Workflow
                        </div>
                        <div className="h-[calc(100%-40px)]">
                          <WorkflowDiagram nodes={nodes} edges={edges} />
                        </div>
                      </div>
                      <div className="flex-1 border border-gray-300 rounded-lg bg-white">
                        <div className="text-center py-2 bg-emerald-50 text-emerald-700 text-sm font-medium border-b">
                          Optimized Workflow
                        </div>
                        <div className="h-[calc(100%-40px)]">
                          <WorkflowDiagram 
                            nodes={optimizedWorkflow.nodes} 
                            edges={optimizedWorkflow.edges} 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Phase 2: Single view - original or optimized
                    <WorkflowDiagram 
                      nodes={workflowMode === 'optimized' && optimizedWorkflow ? optimizedWorkflow.nodes : nodes} 
                      edges={workflowMode === 'optimized' && optimizedWorkflow ? optimizedWorkflow.edges : edges} 
                    />
                  )}
                </div>
                
                {/* Phase 1: Analysis Results Panel */}
                {showAnalysis && analysisResult && (
                  <div className="absolute bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Analysis Results</span>
                      </h3>
                      <button
                        onClick={() => setShowAnalysis(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Overall Score */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Efficiency Score</span>
                          <span className="text-xl font-bold text-purple-600">{analysisResult.overallScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${analysisResult.overallScore}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-red-50 p-2 rounded">
                          <div className="font-semibold text-red-600">{analysisResult.weakPoints?.length || 0}</div>
                          <div className="text-red-500">Weak Points</div>
                        </div>
                        <div className="bg-amber-50 p-2 rounded">
                          <div className="font-semibold text-amber-600">{analysisResult.repetitiveProcesses?.length || 0}</div>
                          <div className="text-amber-500">Repetitive</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <div className="font-semibold text-green-600">{analysisResult.automationOpportunities?.length || 0}</div>
                          <div className="text-green-500">AI Opportunities</div>
                        </div>
                      </div>
                      
                      {/* Key Metrics */}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Time Savings Potential</span>
                          <span className="font-medium text-green-600">{analysisResult.improvementMetrics?.potentialTimeSaving || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Error Reduction</span>
                          <span className="font-medium text-blue-600">{analysisResult.improvementMetrics?.errorReductionPotential || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* View Details Button */}
                      <button 
                        onClick={() => alert('Detailed analysis coming in Phase 2!')}
                        className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
                      >
                        View Detailed Analysis
                      </button>
                    </div>
                  </div>
                )}

                {/* Phase 2: Optimization Summary Panel */}
                {optimizationSummary && workflowMode === 'optimized' && (
                  <div className="absolute bottom-4 left-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Optimization Results</span>
                      </h3>
                      <button
                        onClick={() => setWorkflowMode('original')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Improvement Score */}
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Efficiency Improvement</span>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">{optimizationSummary.originalScore} → {optimizationSummary.optimizedScore}</div>
                            <div className="text-lg font-bold text-emerald-600">+{optimizationSummary.overallImprovementPercentage}</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${optimizationSummary.optimizedScore}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Optimization Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="font-semibold text-blue-600">{optimizationSummary.aiAgentsIntegrated || 0}</div>
                          <div className="text-blue-500">AI Agents</div>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded">
                          <div className="font-semibold text-emerald-600">{optimizationSummary.processesStreamlined || 0}</div>
                          <div className="text-emerald-500">Streamlined</div>
                        </div>
                        <div className="bg-orange-50 p-2 rounded">
                          <div className="font-semibold text-orange-600">{optimizationSummary.errorHandlingAdded || 0}</div>
                          <div className="text-orange-500">Error Fixes</div>
                        </div>
                      </div>
                      
                      {/* Key Benefits */}
                      <div className="border-t pt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Key Benefits:</div>
                        <div className="space-y-1">
                          {optimizationSummary.keyBenefits?.slice(0, 3).map((benefit, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Switch to Comparison */}
                      <button 
                        onClick={() => setWorkflowMode('comparison')}
                        className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200"
                      >
                        Compare Before & After
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface - 35% width */}
          <div className="w-[35%] h-full overflow-hidden">
            <div className="card h-full shadow-lg border border-gray-200">
              <div className="card-header flex-shrink-0 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">AI Process Analysis</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {questionCount >= 5 
                        ? 'Analysis complete - your workflow diagram is ready for review'
                        : `Smart questioning phase - ${5 - questionCount} question${5 - questionCount !== 1 ? 's' : ''} remaining`
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Smart AI</span>
                    </div>
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="card-content flex-1 min-h-0 overflow-hidden bg-white">
                <div className="h-full w-full">
                  <ChatInterface
                    conversation={conversation}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    questionCount={questionCount}
                  />
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
} 