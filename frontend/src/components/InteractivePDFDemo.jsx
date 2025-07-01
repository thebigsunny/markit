import React, { useState } from 'react';
import InteractivePDFViewer from './InteractivePDFViewer';
import './InteractivePDFDemo.css';

const InteractivePDFDemo = ({ file }) => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  const features = [
    {
      id: 'text-interaction',
      title: 'Text Element Interaction',
      description: 'Click on any text to copy it to clipboard. Different text types (headings, paragraphs, lists) have specific styling.',
      icon: '📝'
    },
    {
      id: 'element-filtering',
      title: 'Element Type Filtering',
      description: 'Filter PDF elements by type: text, annotations, images, form fields. See counts for each type.',
      icon: '🔍'
    },
    {
      id: 'element-selection',
      title: 'Multi-Element Selection',
      description: 'Click elements to select them (green highlight). Track selected elements and clear selection.',
      icon: '✅'
    },
    {
      id: 'hover-details',
      title: 'Hover Information',
      description: 'Hover over elements to see detailed tooltips with element type, subtype, and content preview.',
      icon: '💡'
    },
    {
      id: 'visual-feedback',
      title: 'Visual Element Classification',
      description: 'Different element types have unique colors and animations: blue for text, orange for annotations, etc.',
      icon: '🎨'
    }
  ];

  const handleFeatureClick = (featureId) => {
    setActiveFeature(activeFeature === featureId ? null : featureId);
  };

  return (
    <div className="interactive-pdf-demo">
      {/* Feature Showcase Panel */}
      <div className="demo-sidebar">
        <div className="demo-header">
          <h3>🎯 Interactive PDF Features</h3>
          <label className="demo-toggle">
            <input 
              type="checkbox" 
              checked={demoMode} 
              onChange={(e) => setDemoMode(e.target.checked)}
            />
            Demo Mode
          </label>
        </div>
        
        <div className="features-list">
          {features.map(feature => (
            <div 
              key={feature.id}
              className={`feature-item ${activeFeature === feature.id ? 'active' : ''}`}
              onClick={() => handleFeatureClick(feature.id)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <div className="feature-content">
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {demoMode && (
          <div className="demo-instructions">
            <h4>🚀 Try These Actions:</h4>
            <ul>
              <li>Hover over text elements to see classifications</li>
              <li>Click text to copy to clipboard</li>
              <li>Use the filter dropdown to show specific element types</li>
              <li>Click multiple elements to select them</li>
              <li>Look for different colored borders for element types</li>
            </ul>
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="demo-viewer">
        <InteractivePDFViewer file={file} scale={1.0} />
      </div>
    </div>
  );
};

export default InteractivePDFDemo; 