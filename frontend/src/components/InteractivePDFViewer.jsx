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
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectedText, setMultiSelectedText] = useState([]);
  const canvasRefs = useRef({});
  const containerRef = useRef(null);
  const parserRef = useRef(new PDFElementParser());
  const renderingTasks = useRef({}); // Track ongoing render operations

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

  // Copy multiple selected text elements
  const copyMultiSelectedText = useCallback(() => {
    if (multiSelectedText.length === 0) return;
    
    const combinedText = multiSelectedText
      .sort((a, b) => {
        // Sort by page number first, then by vertical position (y coordinate)
        if (a.pageNumber !== b.pageNumber) {
          return a.pageNumber - b.pageNumber;
        }
        return a.y - b.y;
      })
      .map(element => element.content)
      .join('\n');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(combinedText).then(() => {
        alert(`Copied ${multiSelectedText.length} text elements:\n\n${combinedText.substring(0, 200)}${combinedText.length > 200 ? '...' : ''}`);
      }).catch(err => {
        console.error('Could not copy text: ', err);
      });
    }
    
    // Clear multi-selection
    setMultiSelectedText([]);
  }, [multiSelectedText]);

  // Clear multi-selection
  const clearMultiSelection = useCallback(() => {
    setMultiSelectedText([]);
  }, []);

  // Track Shift key for multi-select mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle Shift key, don't interfere with other keys or scrolling
      if (e.key === 'Shift' && !e.repeat) {
        setIsShiftPressed(true);
        setMultiSelectMode(true);
        console.log('Multi-select mode enabled');
      }
    };

    const handleKeyUp = (e) => {
      // Only handle Shift key, don't interfere with other keys or scrolling
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        setMultiSelectMode(false);
        console.log('Multi-select mode disabled');
        
        // Auto-copy selected text when shift is released
        if (multiSelectedText.length > 0) {
          copyMultiSelectedText();
        }
      }
    };

    // Use passive listeners to ensure they don't interfere with scrolling
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { passive: true });
      window.removeEventListener('keyup', handleKeyUp, { passive: true });
    };
  }, [multiSelectedText, copyMultiSelectedText]);

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

  // Handle element hover
  const handleElementHover = (element) => {
    setHoveredElement(element);
  };

  // Handle element click
  const handleElementClick = (element) => {
    console.log('Element clicked:', element);
    
    // Handle multi-select mode (Shift + Click)
    if (isShiftPressed && element.type === 'text') {
      const isAlreadyInMultiSelect = multiSelectedText.find(el => el.id === element.id);
      if (isAlreadyInMultiSelect) {
        // Remove from multi-selection
        setMultiSelectedText(prev => prev.filter(el => el.id !== element.id));
        console.log('Element removed from multi-selection:', element);
      } else {
        // Add to multi-selection
        setMultiSelectedText(prev => [...prev, element]);
        console.log('Element added to multi-selection:', element);
      }
      return; // Exit early in multi-select mode
    }
    
    // Regular click behavior (toggle selection state)
    const isAlreadySelected = selectedElements.find(el => el.id === element.id);
    if (isAlreadySelected) {
      // Remove from selection (deselect)
      setSelectedElements(prev => prev.filter(el => el.id !== element.id));
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
    
    // Show different actions based on text type
    switch (element.subtype) {
      case 'heading':
      case 'subheading':
        alert(`Heading copied: "${element.content}"`);
        break;
      case 'list-item':
        alert(`List item copied: "${element.content}"`);
        break;
      default:
        alert(`Text copied: "${element.content}"`);
    }
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

  if (loading) {
    return <div className="pdf-loading">Loading interactive PDF...</div>;
  }

  if (!pdf || pages.length === 0) {
    return <div className="pdf-loading">No PDF loaded</div>;
  }

  return (
    <div className="interactive-pdf-viewer" ref={containerRef}>
      {/* Control Panel */}
      {(selectedElements.length > 0 || multiSelectMode) && (
        <div className="control-panel">
          {selectedElements.length > 0 && (
            <div className="selection-info">
              <span>{selectedElements.length} elements selected</span>
              <button onClick={() => setSelectedElements([])}>Clear Selection</button>
            </div>
          )}
          
          {multiSelectMode && (
            <div className="multi-select-info">
              <span>🔄 Multi-Select Mode: Hold Shift + Click text to select multiple lines | Scroll freely ↕️</span>
              {multiSelectedText.length > 0 && (
                <>
                  <span>({multiSelectedText.length} text elements selected)</span>
                  <button onClick={copyMultiSelectedText}>Copy Selected Text</button>
                  <button onClick={clearMultiSelection}>Clear Multi-Selection</button>
                </>
              )}
            </div>
          )}
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
                const isMultiSelected = multiSelectedText.find(el => el.id === element.id);
                
                return (
                  <div
                    key={element.id}
                    className={`interactive-element ${element.type} ${element.subtype || ''} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''}`}
                    style={{
                      position: 'absolute',
                      left: Math.max(0, element.x),
                      top: Math.max(0, element.y),
                      width: Math.max(1, element.width),
                      height: Math.max(1, element.height),
                      cursor: 'pointer',
                      backgroundColor: isMultiSelected
                        ? 'rgba(255, 165, 0, 0.3)' // Orange for multi-selected
                        : isSelected 
                          ? 'rgba(0, 255, 0, 0.2)' // Green for regular selected
                          : isHovered 
                            ? getElementHoverColor(element.type) // Blue for hovered
                            : 'transparent',
                      border: isMultiSelected
                        ? '2px solid #ff8c00' // Orange border for multi-selected
                        : isSelected 
                          ? '2px solid #00ff00' // Green border for regular selected
                          : isHovered 
                            ? `1px solid ${getElementBorderColor(element.type)}` // Blue border for hovered
                            : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      fontSize: element.fontSize ? `${Math.max(element.fontSize, 8)}px` : 'inherit',
                      zIndex: isHovered || isSelected || isMultiSelected ? 10 : 3,
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
              <small>Click for more details</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractivePDFViewer; 