import * as pdfjsLib from 'pdfjs-dist';

export class PDFElementParser {
  constructor() {
    this.elements = [];
  }

  async parseDocument(pdf, scale = 1.0) {
    const allElements = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const pageElements = await this.parsePage(pdf, pageNum, scale);
      allElements.push(...pageElements);
    }
    
    return allElements;
  }

  async parsePage(pdf, pageNumber, scale = 1.0) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const elements = [];

    try {
      // Parse text elements
      const textElements = await this.parseTextElements(page, viewport, pageNumber, scale);
      elements.push(...textElements);

      // Parse annotations
      const annotationElements = await this.parseAnnotations(page, viewport, pageNumber, scale);
      elements.push(...annotationElements);

      // Parse images (if available)
      const imageElements = await this.parseImages(page, viewport, pageNumber, scale);
      elements.push(...imageElements);

      // Parse form fields
      const formElements = await this.parseFormFields(page, viewport, pageNumber, scale);
      elements.push(...formElements);

    } catch (error) {
      console.warn(`Error parsing page ${pageNumber}:`, error);
    }

    return elements;
  }

  async parseTextElements(page, viewport, pageNumber, scale) {
    const textContent = await page.getTextContent();
    const elements = [];
    
    // Group text items by lines for better interaction
    const lines = this.groupTextIntoLines(textContent.items);
    
    lines.forEach((line, lineIndex) => {
      line.forEach((item, itemIndex) => {
        // Calculate positions with scale applied
        const x = item.transform[4] * scale;
        const y = viewport.height - (item.transform[5] * scale);
        const width = item.width * scale;
        const height = item.height * scale;
        
        const element = {
          id: `text-${pageNumber}-${lineIndex}-${itemIndex}`,
          type: 'text',
          subtype: this.classifyTextElement(item),
          content: item.str,
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.max(1, width),
          height: Math.max(1, height),
          fontSize: Math.max(8, height), // Minimum font size for visibility
          fontFamily: item.fontName,
          pageNumber,
          transform: item.transform,
          scale: scale,
          isWhespace: /^\s*$/.test(item.str),
          metadata: {
            lineIndex,
            itemIndex,
            hasEOL: item.hasEOL,
            direction: item.dir,
            originalWidth: item.width,
            originalHeight: item.height,
            originalX: item.transform[4],
            originalY: item.transform[5],
          }
        };
        
        // Only add non-whitespace elements with meaningful content
        if (!element.isWhespace && element.content.trim().length > 0) {
          elements.push(element);
        }
      });
    });

    return elements;
  }

  groupTextIntoLines(textItems) {
    const lines = [];
    let currentLine = [];
    let lastY = null;
    const tolerance = 2; // Increased tolerance for line grouping
    
    textItems.forEach(item => {
      const currentY = item.transform[5];
      
      // If Y position changed significantly, start a new line
      if (lastY !== null && Math.abs(currentY - lastY) > Math.max(item.height * 0.3, tolerance)) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
        }
      }
      
      currentLine.push(item);
      lastY = currentY;
    });
    
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  classifyTextElement(textItem) {
    const fontSize = textItem.height;
    const content = textItem.str.trim();
    
    // Classify based on font size and content
    if (fontSize > 18) return 'heading';
    if (fontSize > 14) return 'subheading';
    if (content.match(/^\d+\.?\s/)) return 'list-item';
    if (content.match(/^[A-Z\s]+$/) && content.length > 2) return 'title';
    if (content.length < 3) return 'symbol';
    
    return 'paragraph';
  }

  async parseAnnotations(page, viewport, pageNumber, scale) {
    const annotations = await page.getAnnotations();
    const elements = [];

    annotations.forEach((annotation, index) => {
      // Calculate scaled positions
      const x = annotation.rect[0] * scale;
      const y = viewport.height - (annotation.rect[3] * scale);
      const width = (annotation.rect[2] - annotation.rect[0]) * scale;
      const height = (annotation.rect[3] - annotation.rect[1]) * scale;
      
      const element = {
        id: `annotation-${pageNumber}-${index}`,
        type: 'annotation',
        subtype: annotation.subtype || 'unknown',
        content: annotation.contents || annotation.title || `${annotation.subtype} annotation`,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(10, width), // Minimum width for visibility
        height: Math.max(10, height), // Minimum height for visibility
        pageNumber,
        scale: scale,
        annotation,
        metadata: {
          annotationType: annotation.subtype,
          hasContent: !!(annotation.contents || annotation.title),
          url: annotation.url,
          dest: annotation.dest,
          originalRect: annotation.rect,
        }
      };

      elements.push(element);
    });

    return elements;
  }

  async parseImages(page, viewport, pageNumber, scale) {
    // Note: Image extraction is complex and requires additional processing
    // This is a simplified implementation
    const elements = [];
    
    try {
      const operators = await page.getOperatorList();
      let imageIndex = 0;
      
      for (let i = 0; i < operators.fnArray.length; i++) {
        if (operators.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
          // For now, we'll place images at estimated positions
          // In a more advanced implementation, we'd extract actual image positions
          const element = {
            id: `image-${pageNumber}-${imageIndex}`,
            type: 'image',
            subtype: 'embedded',
            content: `Image ${imageIndex + 1}`,
            x: 50 * scale, // Estimated position
            y: 50 * scale + (imageIndex * 100 * scale),
            width: 100 * scale, // Estimated size
            height: 100 * scale,
            pageNumber,
            scale: scale,
            metadata: {
              operatorIndex: i,
              imageIndex,
            }
          };
          
          elements.push(element);
          imageIndex++;
        }
      }
    } catch (error) {
      console.warn('Could not parse images:', error);
    }

    return elements;
  }

  async parseFormFields(page, viewport, pageNumber, scale) {
    const elements = [];
    
    try {
      const annotations = await page.getAnnotations();
      
      annotations.forEach((annotation, index) => {
        if (annotation.fieldType) {
          const x = annotation.rect[0] * scale;
          const y = viewport.height - (annotation.rect[3] * scale);
          const width = (annotation.rect[2] - annotation.rect[0]) * scale;
          const height = (annotation.rect[3] - annotation.rect[1]) * scale;
          
          const element = {
            id: `form-${pageNumber}-${index}`,
            type: 'form-field',
            subtype: annotation.fieldType,
            content: annotation.fieldName || `${annotation.fieldType} field`,
            x: Math.max(0, x),
            y: Math.max(0, y),
            width: Math.max(20, width), // Minimum width for form fields
            height: Math.max(15, height), // Minimum height for form fields
            pageNumber,
            scale: scale,
            annotation,
            metadata: {
              fieldType: annotation.fieldType,
              fieldName: annotation.fieldName,
              fieldValue: annotation.fieldValue,
              required: annotation.required,
              readOnly: annotation.readOnly,
              originalRect: annotation.rect,
            }
          };

          elements.push(element);
        }
      });
    } catch (error) {
      console.warn('Could not parse form fields:', error);
    }

    return elements;
  }

  // Utility methods for element manipulation
  static createElement(type, data) {
    return {
      id: data.id || `${type}-${Date.now()}`,
      type,
      ...data,
      timestamp: Date.now(),
    };
  }

  static filterElementsByType(elements, type) {
    return elements.filter(element => element.type === type);
  }

  static filterElementsByPage(elements, pageNumber) {
    return elements.filter(element => element.pageNumber === pageNumber);
  }

  static getElementsByBoundingBox(elements, x, y, width, height) {
    return elements.filter(element => {
      return element.x >= x && 
             element.y >= y && 
             element.x + element.width <= x + width &&
             element.y + element.height <= y + height;
    });
  }

  // New utility method to rescale elements
  static rescaleElements(elements, newScale, oldScale) {
    const scaleFactor = newScale / oldScale;
    
    return elements.map(element => ({
      ...element,
      x: element.x * scaleFactor,
      y: element.y * scaleFactor,
      width: element.width * scaleFactor,
      height: element.height * scaleFactor,
      fontSize: element.fontSize ? element.fontSize * scaleFactor : undefined,
      scale: newScale,
    }));
  }
}

export default PDFElementParser; 