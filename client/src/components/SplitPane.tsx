import React, { FC, useState } from 'react';

type SplitPaneProps = {
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  children: [React.ReactNode, React.ReactNode];
};

const SplitPane: FC<SplitPaneProps> = ({ 
  children, 
  initialLeftWidth = 500, 
  minLeftWidth = 300,
  maxLeftWidth 
}) => {
  const [leftWidth, setLeftWidth] = useState<number>(initialLeftWidth);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // disable text selection and change cursor
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.body.style.pointerEvents = 'none';
    
    const startX = e.clientX;
    const startWidth = leftWidth;
    
    const onMouseMove = (e2: MouseEvent) => {
      e2.preventDefault();
      const maxWidth = maxLeftWidth || window.innerWidth - 300; // ensure 300px min for right pane
      const newWidth = Math.max(minLeftWidth, Math.min(maxWidth, startWidth + e2.clientX - startX));
      setLeftWidth(newWidth);
      // Trigger resize event immediately for Monaco
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setIsDragging(false);
      // restore text selection and cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.body.style.pointerEvents = '';
      // Final resize event
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 10);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };  const [leftChild, rightChild] = children;

  return (
    <div className="flex flex-1 h-full select-none">
      {/* Left pane with fixed width */}
      <div style={{ width: leftWidth, flexShrink: 0 }} className="flex flex-col h-full overflow-hidden">
        {leftChild}
      </div>
      {/* Resizer handle */}
      <div
        onMouseDown={onMouseDown}
        className={`flex-shrink-0 w-1 h-full cursor-col-resize border-r border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-500 hover:bg-opacity-20 transition-colors z-10 ${
          isDragging ? 'bg-blue-500 bg-opacity-30' : ''
        }`}
        style={{ minWidth: '4px' }}
      />
      {/* Right pane flex-grow */}
      <div className="flex-1 h-full overflow-hidden" style={{ minWidth: '300px' }}>
        {rightChild}
      </div>
    </div>
  );
};

export default SplitPane;
