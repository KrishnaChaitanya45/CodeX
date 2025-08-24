"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FileText,
  Plus,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  X,
  Check
} from 'lucide-react';

interface FileExplorerProps {
  files: any;
  activeFile: string;
  expandedFolders: Set<string>;
  onFileSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onCreateFile: (path: string, type: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
}

interface FileExplorerProps {
  files: any;
  activeFile: string;
  expandedFolders: Set<string>;
  onFileSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onCreateFile: (path: string, type: string) => void;
  onCreateFolder: (path: string) => void;
}

const SUPPORTED_FILE_TYPES = [
  { ext: 'txt', label: 'Text File', icon: '📄', color: 'text-dark-300' },
  { ext: 'md', label: 'Markdown', icon: '📝', color: 'text-primary-400' },
  { ext: 'html', label: 'HTML', icon: '🌐', color: 'text-secondary-400' },
  { ext: 'css', label: 'CSS', icon: '🎨', color: 'text-primary-300' },
  { ext: 'js', label: 'JavaScript', icon: '⚡', color: 'text-yellow-400' },
  { ext: 'jsx', label: 'React JSX', icon: '⚛️', color: 'text-primary-300' }
];

export function FileExplorer({ 
  files, 
  activeFile, 
  expandedFolders, 
  onFileSelect, 
  onToggleFolder,
  onCreateFile,
  onCreateFolder
}: FileExplorerProps) {
  
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('txt');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const fileType = SUPPORTED_FILE_TYPES.find(type => type.ext === ext);
    
    if (fileType) {
      return (
        <span className="text-sm mr-2" title={fileType.label}>
          {fileType.icon}
        </span>
      );
    }
    
    return <FileText className="w-4 h-4 mr-2 text-dark-400" />;
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const fileName = `${newFileName}.${selectedFileType}`;
      onCreateFile(fileName, selectedFileType);
      setNewFileName('');
      setShowNewFileDialog(false);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName);
      setNewFolderName('');
      setShowNewFolderDialog(false);
    }
  };

  const handleFileRename = (oldPath: string, newName: string) => {
    if (newName.trim() && newName !== oldPath.split('/').pop()) {
      const pathParts = oldPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      
      // TODO: Add onRenameFile to props and call it here
      console.log('Rename:', oldPath, '->', newPath);
    }
    setEditingFile(null);
    setEditingFileName('');
  };

  const startEditing = (filePath: string) => {
    setEditingFile(filePath);
    setEditingFileName(filePath.split('/').pop() || '');
  };

  const cancelEditing = () => {
    setEditingFile(null);
    setEditingFileName('');
  };

  const renderFileTree = (files: any, path = '') => {
    return Object.entries(files).map(([name, item]: [string, any]) => {
      const fullPath = path ? `${path}/${name}` : name;
      
      if (item.type === 'folder') {
        const isExpanded = expandedFolders.has(fullPath);
        return (
          <div key={fullPath}>
            <motion.div
              className="flex items-center px-2 py-1 cursor-pointer hover:bg-primary-900/20 rounded transition-colors"
              onClick={() => onToggleFolder(fullPath)}
              whileHover={{ x: 2 }}
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 mr-1 text-primary-400" /> : 
                <ChevronRight className="w-4 h-4 mr-1 text-primary-400" />
              }
              <Folder className="w-4 h-4 mr-2 text-primary-400" />
              <span className="text-dark-200 text-sm">{name}</span>
            </motion.div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-4 border-l border-primary-600/30"
                >
                  {renderFileTree(item.children, fullPath)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      } else {
        const isActive = activeFile === fullPath;
        const ext = name.split('.').pop()?.toLowerCase();
        const fileType = SUPPORTED_FILE_TYPES.find(type => type.ext === ext);
        const isEditing = editingFile === fullPath;
        
        if (isEditing) {
          return (
            <motion.div
              key={fullPath}
              className="flex items-center px-2 py-1 rounded bg-primary-900/20"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
            >
              {getFileIcon(name)}
              <input
                type="text"
                value={editingFileName}
                onChange={(e) => setEditingFileName(e.target.value)}
                className="flex-1 px-1 py-0 bg-dark-700 border border-primary-500 rounded text-white text-sm focus:outline-none focus:border-primary-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFileRename(fullPath, editingFileName);
                  } else if (e.key === 'Escape') {
                    cancelEditing();
                  }
                }}
                onBlur={() => handleFileRename(fullPath, editingFileName)}
                autoFocus
              />
              <div className="flex items-center ml-2 gap-1">
                <button
                  onClick={() => handleFileRename(fullPath, editingFileName)}
                  className="p-1 text-green-400 hover:text-green-300 rounded"
                  title="Save (Enter)"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 text-red-400 hover:text-red-300 rounded"
                  title="Cancel (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        }
        
        return (
          <motion.div
            key={fullPath}
            className={`flex items-center px-2 py-1 cursor-pointer rounded transition-colors group ${
              isActive 
                ? 'bg-secondary-600/30 border-l-2 border-secondary-500' 
                : 'hover:bg-primary-900/20'
            }`}
            onClick={() => onFileSelect(fullPath)}
            onDoubleClick={() => startEditing(fullPath)}
            whileHover={{ x: 2 }}
          >
            {getFileIcon(name)}
            <span className={`text-sm flex-1 ${isActive ? 'text-secondary-200' : fileType?.color || 'text-dark-300'}`}>
              {name}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(fullPath);
                }}
                className="p-1 text-dark-400 hover:text-white rounded"
                title="Rename (Double-click)"
              >
                <FileText className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        );
      }
    });
  };

  return (
    <div className="h-full bg-dark-900 border-r border-dark-700 relative">
      <div className="p-4 border-b border-dark-700">
        <h2 className="text-white font-semibold mb-3">Explorer</h2>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewFileDialog(true)}
            className="flex items-center px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
          >
            <Plus className="w-3 h-3 mr-1" />
            File
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewFolderDialog(true)}
            className="flex items-center px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
          >
            <FolderPlus className="w-3 h-3 mr-1" />
            Folder
          </motion.button>
        </div>
      </div>

      {/* New File Dialog */}
      <AnimatePresence>
        {showNewFileDialog && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-dark-800 border-b border-primary-600/30 p-4 z-10"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-sm font-medium">Create New File</h3>
              <button
                onClick={() => setShowNewFileDialog(false)}
                className="text-dark-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="File name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-primary-600/30 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
              />
              
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_FILE_TYPES.map((type) => (
                  <button
                    key={type.ext}
                    onClick={() => setSelectedFileType(type.ext)}
                    className={`flex items-center px-2 py-1 rounded text-xs transition-colors ${
                      selectedFileType === type.ext
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    <span className="mr-1">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleCreateFile}
                  className="flex items-center px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Create
                </button>
                <button
                  onClick={() => setShowNewFileDialog(false)}
                  className="px-3 py-1 bg-dark-600 hover:bg-dark-700 text-white text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Dialog */}
      <AnimatePresence>
        {showNewFolderDialog && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-dark-800 border-b border-primary-600/30 p-4 z-10"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-sm font-medium">Create New Folder</h3>
              <button
                onClick={() => setShowNewFolderDialog(false)}
                className="text-dark-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-primary-600/30 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              
              <div className="flex gap-2">
                <button
                  onClick={handleCreateFolder}
                  className="flex items-center px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Create
                </button>
                <button
                  onClick={() => setShowNewFolderDialog(false)}
                  className="px-3 py-1 bg-dark-600 hover:bg-dark-700 text-white text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2 overflow-y-auto h-full">
        {renderFileTree(files)}
      </div>
    </div>
  );
}

