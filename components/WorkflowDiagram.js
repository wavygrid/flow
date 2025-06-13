import React, { useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

const WorkflowDiagram = ({ nodes, edges }) => {
  const [nodeState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgeState, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes and edges when props change
  React.useEffect(() => {
    // Ensure nodes have proper positioning and are visible
    const adjustedNodes = nodes.map(node => ({
      ...node,
      position: {
        x: Math.max(0, node.position?.x || 100),
        y: Math.max(0, node.position?.y || 100)
      }
    }));
    setNodes(adjustedNodes);
  }, [nodes, setNodes]);

  React.useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Custom node styles
  const nodeTypes = {
    // You can define custom node types here if needed
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%',
        border: '2px dashed #ccc',
        backgroundColor: '#f9f9f9',
        position: 'relative'
      }}
    >
      <ReactFlow
        nodes={nodeState}
        edges={edgeState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView={true}
        fitViewOptions={{ padding: 0.3, includeHiddenNodes: false }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={3}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: 'white'
        }}
      >
        <Controls position="top-left" />
        <Background 
          color="#aaa" 
          gap={20} 
          variant="dots"
        />
        
        {/* Empty state panel */}
        {nodeState.length === 0 && (
          <Panel position="top-center">
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 shadow-sm">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">No workflow diagram yet</h3>
                  <p className="text-sm text-gray-600 max-w-sm">
                    Start the conversation to generate your visual workflow. Describe your business process step by step.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    <span>Drag to move</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    <span>Scroll to zoom</span>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export default WorkflowDiagram; 