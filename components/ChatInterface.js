import React, { useState, useRef, useEffect } from 'react';

const ChatInterface = ({ conversation, onSendMessage, isLoading, questionCount = 0 }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Enhanced example suggestions based on different industries
  const getExampleSuggestions = () => {
    const examples = [
      { industry: "E-commerce", text: "Customer places order → payment processing → inventory check → fulfillment → shipping" },
      { industry: "Healthcare", text: "Patient appointment → check-in → medical assessment → treatment → billing" },
      { industry: "Manufacturing", text: "Order received → production planning → manufacturing → quality control → delivery" },
      { industry: "HR", text: "Job application → screening → interview → background check → onboarding" },
      { industry: "Support", text: "Customer issue → ticket creation → assignment → resolution → feedback" }
    ];
    return examples;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0 pr-2">
        {conversation.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className="flex items-start space-x-2 max-w-[90%]">
              {message.sender === 'ai' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              )}
              <div
                className={`rounded-lg p-4 shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.text}
                </div>
                {message.sender === 'ai' && (
                  <div className="flex items-center mt-3 text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span>AI Workflow Analyst</span>
                      {questionCount < 5 && (
                        <div className="ml-2 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                          Question {questionCount + 1}/5
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {message.sender === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-start space-x-2 max-w-[90%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-700">Analyzing your workflow...</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {questionCount < 4 ? 'Generating intelligent questions and workflow options' : 'Creating your comprehensive workflow diagram'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t bg-gray-50 p-4 rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={questionCount >= 5 
                ? "✅ Workflow analysis complete! Your diagram is ready for review." 
                : questionCount === 0
                ? "Describe your business process... (e.g., 'Customer service ticket handling process' or 'Online order fulfillment workflow')"
                : "Continue describing your workflow or answer the question above..."
              }
              className="w-full resize-none pr-12 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
              rows="1"
              disabled={isLoading || questionCount >= 5}
              style={{ minHeight: '48px', maxHeight: '120px', padding: '12px 48px 12px 12px' }}
            />
            <div className="absolute right-3 bottom-3">
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || questionCount >= 5}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  !inputValue.trim() || isLoading || questionCount >= 5
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                }`}
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Enhanced Tips and Examples */}
          <div className="space-y-3">
            {/* Progress and Status */}
            <div className="flex items-center justify-between text-xs">
              {questionCount >= 5 ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">✨ Workflow analysis complete! Review your comprehensive diagram above.</span>
                </div>
              ) : (
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">AI analyzing your process</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs">Be specific about steps, decisions, and stakeholders</span>
                  </div>
                </div>
              )}
              
              {questionCount < 5 && (
                <div className="flex items-center space-x-3 text-gray-500">
                  <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 text-xs font-mono bg-white rounded border shadow-sm">Shift</kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-white rounded border shadow-sm">Enter</kbd>
                    <span className="text-xs">new line</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 text-xs font-mono bg-white rounded border shadow-sm">Enter</kbd>
                    <span className="text-xs">send</span>
                  </div>
                </div>
              )}
            </div>

            {/* Industry Examples - Only show on first interaction */}
            {questionCount === 0 && conversation.length <= 1 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-800">Quick Start Examples</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {getExampleSuggestions().slice(0, 3).map((example, index) => (
                    <div key={index} className="flex items-center space-x-2 text-blue-700">
                      <span className="font-medium text-blue-600">{example.industry}:</span>
                      <span className="truncate">{example.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  💡 I&apos;ll automatically detect your industry and ask intelligent questions to create the most realistic workflow possible.
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
  };
  
  export default ChatInterface; 