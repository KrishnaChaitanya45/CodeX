import React, { FC } from 'react';

type TabsProps = {
  files: string[];
  activeFile: string;
  onSelect: (file: string) => void;
};

const Tabs: FC<TabsProps> = ({ files, activeFile, onSelect }) => (
  <div className="flex bg-gray-800 text-gray-200 text-sm h-8 border-b border-gray-700">
    {files.map((file) => (
      <button
        key={file}
        onClick={() => onSelect(file)}
        className={`flex items-center px-3 h-full whitespace-nowrap ${
          file === activeFile
            ? 'bg-gray-900 text-white font-medium'
            : 'hover:bg-gray-700'
        }`}
      >
        {file}
      </button>
    ))}
  </div>
);

export default Tabs;
