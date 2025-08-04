import React, { FC, useState } from 'react';
import FileCreateModal from './FileCreateModal';

type FileExplorerProps = {
  files: string[];
  activeFile: string;
  onSelect: (file: string) => void;
  onCreate: (file: string) => void;
};

const FileExplorer: FC<FileExplorerProps> = ({ files, activeFile, onSelect, onCreate }) => {
  // file creation modal
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = () => setIsModalOpen(true);
  const handleModalCreate = (filename: string) => {
    onCreate(filename);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div
        className="px-3 py-2 border-b border-gray-400 flex items-center justify-between cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-1 text-sm font-semibold">
          {isOpen ? '▼' : '►'} Files
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleCreate(); }}
          className="text-blue-600 dark:text-blue-400 hover:text-opacity-80"
          title="New file"
        >
          ➕
        </button>
      </div>
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file}>
                <button
                  onClick={() => onSelect(file)}
                  className={`w-full text-left flex items-center gap-1 px-2 py-1 rounded ${
                    file === activeFile
                      ? 'bg-gray-300 dark:bg-gray-700 font-medium text-gray-900 dark:text-white'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  📄 {file}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <FileCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleModalCreate}
      />
    </div>
  );
}

export default FileExplorer;
