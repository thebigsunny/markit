import React, { useRef, useLayoutEffect } from 'react';
import './TextbookCard.css';

const TextbookCard = ({ textbook }) => {
  const containerRef = useRef(null);
  const titleRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const title = titleRef.current;

    if (!container || !title) return;

    // Reset font size to the max size to recalculate
    title.style.fontSize = '1.4rem';
    let currentSize = 1.4;

    // Keep decreasing font size until it's not overflowing
    while (title.scrollHeight > container.clientHeight && currentSize > 0.5) {
      currentSize -= 0.1;
      title.style.fontSize = `${currentSize}rem`;
    }
  }, [textbook.title]);

  return (
    <div className="book">
      <div className="book-cover" ref={containerRef}>
        <h2 ref={titleRef}>{textbook.title}</h2>
      </div>
    </div>
  );
};

export default TextbookCard;
