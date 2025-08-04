import React, { FC, useState, useRef } from 'react';

const ResizableSidebar: FC<{
  children: React.ReactNode;
  minWidth?: number;
}> = ({ children, minWidth = 200 }) => {
  const [width, setWidth] = useState<number>(250);
  const [open, setOpen] = useState<boolean>(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMouseMove = (e2: MouseEvent) => {
      const newWidth = Math.max(minWidth, startWidth + e2.clientX - startX);
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex h-full">
      {/* Toggle button always visible */}
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-6 bg-gray-200 dark:bg-gray-700 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
        title={open ? 'Collapse Sidebar' : 'Expand Sidebar'}
      >
        {open ? '◀' : '▶'}
      </div>
      {/* Collapsible container */}
      {open && (
        <div className="flex h-full" ref={sidebarRef} style={{ width }}>
          <div className="flex-1 overflow-hidden">{children}</div>
          <div
            onMouseDown={onMouseDown}
            className="w-1 cursor-col-resize bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
            title="Resize Sidebar"
          />
        </div>
      )}
    </div>
  );
};

export default ResizableSidebar;
