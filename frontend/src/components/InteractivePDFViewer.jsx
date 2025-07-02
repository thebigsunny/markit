import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './InteractivePDFViewer.css';
import PDFElementParser from '../utils/pdfParser';

// Set up PDF.js worker for version 2.16.105
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.js',
  import.meta.url
).toString();

const InteractivePDFViewer = ({ file, scale = 1.0 }) => {
  const [pdf, setPdf] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const canvasRefs = useRef({});
  const containerRef = useRef(null);
  const parserRef = useRef(new PDFElementParser());
  const renderingTasks = useRef({}); // Track ongoing render operations
  const chatMessagesRef = useRef(null);

  // Helper functions
  const getElementHoverColor = (type) => {
    const colors = {
      text: 'rgba(0, 123, 255, 0.1)',
      annotation: 'rgba(255, 165, 0, 0.2)',
      image: 'rgba(255, 0, 255, 0.2)',
      'form-field': 'rgba(0, 255, 0, 0.2)',
    };
    return colors[type] || 'rgba(255, 255, 0, 0.3)';
  };

  const getElementBorderColor = (type) => {
    const colors = {
      text: '#007bff',
      annotation: '#ff8c00',
      image: '#ff00ff',
      'form-field': '#00ff00',
    };
    return colors[type] || '#007bff';
  };

  // Parse pages with current scale
  const parsePages = useCallback(async (pdfDoc, currentScale) => {
    if (!pdfDoc) return [];
    
    const parsedPages = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const pageElements = await parserRef.current.parsePage(pdfDoc, i, currentScale);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: currentScale });
        
        parsedPages.push({
          pageNumber: i,
          viewport,
          elements: pageElements,
          page
        });
      } catch (error) {
        console.error(`Error parsing page ${i}:`, error);
      }
    }
    return parsedPages;
  }, []);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      if (!file) return;
      
      try {
        setLoading(true);
        
        // Cancel any ongoing render operations
        Object.keys(renderingTasks.current).forEach(pageNum => {
          if (renderingTasks.current[pageNum]) {
            renderingTasks.current[pageNum].cancel();
          }
        });
        renderingTasks.current = {};
        
        const loadingTask = pdfjsLib.getDocument(file);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        
        // Parse all pages using advanced parser with current scale
        const parsedPages = await parsePages(pdfDoc, scale);
        setPages(parsedPages);
        
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [file, parsePages]);

  // Handle scale changes separately
  useEffect(() => {
    const updateScale = async () => {
      if (!pdf || pages.length === 0) return;
      
      try {
        setLoading(true);
        
        // Cancel any ongoing render operations
        Object.keys(renderingTasks.current).forEach(pageNum => {
          if (renderingTasks.current[pageNum]) {
            renderingTasks.current[pageNum].cancel();
          }
        });
        renderingTasks.current = {};
        
        // Re-parse pages with new scale
        const updatedPages = await parsePages(pdf, scale);
        setPages(updatedPages);
        
        // Clear selections as positions have changed
        setSelectedElements([]);
        setHoveredElement(null);
        
      } catch (error) {
        console.error('Error updating scale:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only update scale if we have a PDF loaded
    if (pdf && pages.length > 0) {
      updateScale();
    }
  }, [scale, pdf, parsePages]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current && chatMessages.length > 0) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Automatically hide chat panel when no messages are left
  useEffect(() => {
    if (chatMessages.length === 0 && chatVisible) {
      setChatVisible(false);
    }
  }, [chatMessages, chatVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all ongoing render operations on cleanup
      Object.keys(renderingTasks.current).forEach(pageNum => {
        if (renderingTasks.current[pageNum]) {
          renderingTasks.current[pageNum].cancel();
        }
      });
    };
  }, []);

  // Render page canvas with proper error handling and cancellation
  const renderPageCanvas = useCallback(async (pageData) => {
    const pageNumber = pageData.pageNumber;
    const canvas = canvasRefs.current[pageNumber];
    
    if (!canvas || !pageData.page) return;

    // Cancel any existing render task for this page
    if (renderingTasks.current[pageNumber]) {
      renderingTasks.current[pageNumber].cancel();
    }

    try {
      const context = canvas.getContext('2d');
      const viewport = pageData.viewport;
      
      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear canvas before rendering
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // Start render task and store reference
      const renderTask = pageData.page.render(renderContext);
      renderingTasks.current[pageNumber] = renderTask;
      
      await renderTask.promise;
      
      // Clear the task reference after completion
      delete renderingTasks.current[pageNumber];
      
    } catch (error) {
      // Ignore cancellation errors
      if (error.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNumber}:`, error);
      }
      delete renderingTasks.current[pageNumber];
    }
  }, []);

  // Render canvases when pages are loaded or updated
  useEffect(() => {
    if (pages.length > 0) {
      // Render pages sequentially to avoid conflicts
      const renderPagesSequentially = async () => {
        for (const pageData of pages) {
          await renderPageCanvas(pageData);
          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      };
      
      renderPagesSequentially().catch(error => {
        console.error('Error rendering canvases:', error);
      });
    }
  }, [pages, renderPageCanvas]);

  // Handle element hover
  const handleElementHover = (element) => {
    setHoveredElement(element);
  };

  // Handle element click
  const handleElementClick = (element) => {
    console.log('Element clicked:', element);
    
    // Regular click behavior (toggle selection state)
    const isAlreadySelected = selectedElements.find(el => el.id === element.id);
    if (isAlreadySelected) {
      // Remove from selection (deselect)
      setSelectedElements(prev => prev.filter(el => el.id !== element.id));
      
      // Also remove corresponding message from chat panel
      setChatMessages(prev => prev.filter(msg => msg.elementId !== element.id));
      
      console.log('Element deselected:', element);
      return; // Exit early to avoid triggering action handlers when deselecting
    } else {
      // Add to selection
      setSelectedElements(prev => [...prev, element]);
      console.log('Element selected:', element);
    }
    
    // Handle different element types (only when selecting, not deselecting)
    switch (element.type) {
      case 'text':
        handleTextElementClick(element);
        break;
      case 'annotation':
        handleAnnotationClick(element);
        break;
      case 'image':
        handleImageClick(element);
        break;
      case 'form-field':
        handleFormFieldClick(element);
        break;
      default:
        console.log('Unknown element type clicked');
    }
  };

  const handleTextElementClick = (element) => {
    // Copy text to clipboard with error handling
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(element.content).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
    
    // Add text to chat panel instead of showing alerts
    const newMessage = {
      id: Date.now(),
      elementId: element.id, // Store element ID to allow removal on deselect
      text: element.content,
      type: element.subtype || 'text',
      timestamp: new Date(),
      pageNumber: element.pageNumber
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatVisible(true);
  };

  const handleAnnotationClick = (element) => {
    if (element.metadata && element.metadata.url) {
      if (confirm(`Open link: ${element.metadata.url}?`)) {
        window.open(element.metadata.url, '_blank');
      }
    } else {
      alert(`Annotation: ${element.content}`);
    }
  };

  const handleImageClick = (element) => {
    alert(`Image element detected on page ${element.pageNumber}`);
  };

  const handleFormFieldClick = (element) => {
    const fieldInfo = `Field: ${element.metadata?.fieldName || 'Unnamed'}\nType: ${element.metadata?.fieldType}`;
    alert(fieldInfo);
  };

  const clearChatMessages = () => {
    setChatMessages([]);
  };

  if (loading) {
    return <div className="pdf-loading">Loading interactive PDF...</div>;
  }

  if (!pdf || pages.length === 0) {
    return <div className="pdf-loading">No PDF loaded</div>;
  }

  return (
    <div className={`interactive-pdf-viewer ${chatVisible ? 'chat-active' : ''}`} ref={containerRef}>
              <div className="pdf-content">
          {/* Control Panel */}
          {selectedElements.length > 0 && (
            <div className="control-panel">
              <div className="selection-info">
                <span>{selectedElements.length} elements selected</span>
                <button onClick={() => {
                  setSelectedElements([]);
                  setChatMessages([]);
                  setChatVisible(false);
                }}>Clear Selection</button>
              </div>
            </div>
          )}

        {/* PDF Pages */}
        {pages.map((pageData) => {
          const elements = pageData.elements;
          
          return (
            <div 
              key={pageData.pageNumber} 
              className="interactive-page-container"
              style={{ 
                width: pageData.viewport.width,
                height: pageData.viewport.height,
                position: 'relative',
                marginBottom: '20px'
              }}
            >
              {/* PDF Canvas */}
              <canvas
                ref={(el) => {
                  if (el) {
                    canvasRefs.current[pageData.pageNumber] = el;
                  }
                }}
                className="pdf-canvas"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1,
                  width: pageData.viewport.width,
                  height: pageData.viewport.height
                }}
              />
              
              {/* Interactive Elements Overlay */}
              <div className="elements-overlay" style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                zIndex: 2,
                width: pageData.viewport.width,
                height: pageData.viewport.height
              }}>
                {elements.map((element) => {
                  const isHovered = hoveredElement?.id === element.id;
                  const isSelected = selectedElements.find(el => el.id === element.id);
                  
                  return (
                    <div
                      key={element.id}
                      className={`interactive-element ${element.type} ${element.subtype || ''} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
                      style={{
                        position: 'absolute',
                        left: Math.max(0, element.x),
                        top: Math.max(0, element.y),
                        width: Math.max(1, element.width),
                        height: Math.max(1, element.height),
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'rgba(0, 255, 0, 0.4)' // Green highlight for selected text
                          : isHovered 
                            ? getElementHoverColor(element.type) // Blue for hovered
                            : 'transparent',
                        border: 'none', // Remove borders to avoid underline effect
                        borderRadius: '2px', // Slight rounding for better appearance
                        transition: 'all 0.2s ease',
                        fontSize: element.fontSize ? `${Math.max(element.fontSize, 8)}px` : 'inherit',
                        zIndex: isHovered || isSelected ? 10 : 3,
                      }}
                      onMouseEnter={() => handleElementHover(element)}
                      onMouseLeave={() => setHoveredElement(null)}
                      onClick={() => handleElementClick(element)}
                      title={`${element.type}${element.subtype ? ` (${element.subtype})` : ''}: ${element.content}`}
                    />
                  );
                })}
              </div>
              
              {/* Page number indicator */}
              <div className="page-indicator">
                Page {pageData.pageNumber} - {elements.length} elements (Scale: {Math.round(scale * 100)}%)
              </div>
            </div>
          );
        })}
        
        {/* Enhanced tooltip */}
        {hoveredElement && (
          <div className="element-tooltip enhanced">
            <div className="tooltip-header">
              <strong>{hoveredElement.type.charAt(0).toUpperCase() + hoveredElement.type.slice(1)}</strong>
              {hoveredElement.subtype && <span className="subtype">({hoveredElement.subtype})</span>}
            </div>
            <div className="tooltip-content">
              {hoveredElement.content.length > 50 
                ? hoveredElement.content.substring(0, 50) + '...'
                : hoveredElement.content
              }
            </div>
            {hoveredElement.metadata && Object.keys(hoveredElement.metadata).length > 0 && (
              <div className="tooltip-metadata">
                <small>Click to chat</small>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {chatVisible && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3>Selected Text</h3>
            <div className="chat-controls">
              <button 
                className="clear-chat"
                onClick={clearChatMessages}
              >
                Clear
              </button>
              <button 
                className="close-chat"
                onClick={() => setChatVisible(false)}
              >
                ×
              </button>
            </div>
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            {chatMessages.length > 0 ? (
              chatMessages.map((message) => (
                <div key={message.id} className="chat-message">
                  <div className="message-content">
                    <div className="message-text">{message.text}</div>
                    <div className="message-meta">
                      <span className="message-type">{message.type}</span>
                      <span className="message-page">Page {message.pageNumber}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-chat">
                <p>Click on text elements in the PDF to see them here!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractivePDFViewer; 