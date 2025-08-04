import React, { FC, useState } from 'react';

type FileCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (filename: string) => void;
};

const FileCreateModal: FC<FileCreateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center  bg-opacity-40 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">📄 New File</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="filename.ext"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-200">Cancel</button>
          <button
            onClick={() => {
              if (name.trim()) {
                onCreate(name.trim());
                setName('');
                onClose();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileCreateModal;
