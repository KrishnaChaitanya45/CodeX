import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fsSocket } from '../helpers/fileSystemSocket';
import {
  FS_FETCH_QUEST_META,
  FS_LOAD_DIR,
  FS_FETCH_FILE_CONTENT,
  FS_FILE_CONTENT_UPDATE,
  FS_NEW_FILE,
  FS_DELETE_FILE,
  FS_EDIT_FILE_META,
  DirContentResponse,
  QuestMetaResponse,
  FileInfo,
  FileContentResponse,
} from '../constants/FS_MessageTypes';

// Module-level cache to survive Fast Refresh / remounts.
let globalQuestMetaCache: QuestMetaResponse | null = null;

// Helper to build a file tree from a flat list
const buildFileTree = (files: FileInfo[]) => {
  const tree: any = {};
  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // This is the file/folder itself
        current[part] = {
          type: file.isDir ? 'folder' : 'file',
          children: file.isDir ? {} : undefined,
          path: file.path,
          size: file.size,
          modTime: file.modTime,
          isDir: file.isDir
        };
      } else {
        // This is a parent directory
        if (!current[part]) {
          current[part] = {
            type: 'folder',
            children: {},
            path: parts.slice(0, i + 1).join('/'),
            isDir: true
          };
        }
        current = current[part].children;
      }
    }
  });
  return tree;
};

export const useFileSystem = (socketUrl: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<any>({});
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Request deduplication
  const pendingRequests = useRef<Set<string>>(new Set());
  const directoryCache = useRef<Record<string, FileInfo[]>>({});
  const initialized = useRef(false);
  const isInitializing = useRef(false);
  // Module-level cache is `globalQuestMetaCache` declared above
  

  // Memoize the built file tree to prevent unnecessary re-renders
  const memoizedFileTree = useMemo(() => fileTree, [fileTree]);

  // Helpers to operate on the nested fileTree structure (pure functions)
  const insertNodeAtPath = (tree: any, path: string, node: any) => {
    const newTree = JSON.parse(JSON.stringify(tree || {}));
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return newTree;
    let current = newTree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        current[part] = node;
      } else {
        if (!current[part]) {
          current[part] = { type: 'folder', children: {}, path: parts.slice(0, i + 1).join('/'), isDir: true };
        }
        if (!current[part].children) current[part].children = {};
        current = current[part].children;
      }
    }
    return newTree;
  };

  const deleteNodeAtPath = (tree: any, path: string) => {
    const newTree = JSON.parse(JSON.stringify(tree || {}));
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return newTree;
    let current = newTree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || !current[part].children) {
        return newTree; // nothing to delete
      }
      current = current[part].children;
    }
    const last = parts[parts.length - 1];
    if (current && current[last]) {
      delete current[last];
    }
    return newTree;
  };

  const getNodeAtPath = (tree: any, path: string) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current[part]) return null;
      if (i === parts.length - 1) return current[part];
      current = current[part].children;
      if (!current) return null;
    }
    return null;
  };

  const moveNode = (tree: any, oldPath: string, newPath: string) => {
    const node = getNodeAtPath(tree, oldPath);
    if (!node) return tree;
    // update node.path to newPath
    const newNode = JSON.parse(JSON.stringify(node));
    newNode.path = newPath;
    let t = deleteNodeAtPath(tree, oldPath);
    t = insertNodeAtPath(t, newPath, newNode);
    return t;
  };

  // Initialize connection and fetch initial data - only run once
  useEffect(() => {
    if (initialized.current || isInitializing.current) return;
    
    let mounted = true;
    isInitializing.current = true;

    const initializeConnection = async () => {
      try {
        setLoading(true);
        setError(null);
        setConnectionError(null);
        
        console.log("Connecting to filesystem...");
        await fsSocket.connect(socketUrl);
        
        if (!mounted) return;
        
        setIsConnected(true);
        // If we have a cached quest meta, use it and don't refetch
        if (globalQuestMetaCache) {
          const tree = buildFileTree(globalQuestMetaCache.files);
          setFileTree(tree);
          directoryCache.current[''] = globalQuestMetaCache.files;
          initialized.current = true;
          console.log('Using cached quest metadata');
        } else {
          console.log("Fetching initial quest metadata...");
          const questData: QuestMetaResponse = await fsSocket.sendMessage(
            FS_FETCH_QUEST_META, 
            { path: '' },
            socketUrl
          );
          
          if (!mounted) return;
          
          console.log("Quest metadata received:", questData);
          const tree = buildFileTree(questData.files);
          setFileTree(tree);
          
          // Cache the initial file list globally so reconnects won't refetch
          directoryCache.current[''] = questData.files;
          globalQuestMetaCache = questData;
          initialized.current = true;
        }
        
      } catch (err) {
        console.error("Failed to initialize filesystem:", err);
        if (mounted) {
          setConnectionError(err instanceof Error ? err.message : 'Connection failed');
          setError('Failed to connect to file system service');
          setIsConnected(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          isInitializing.current = false;
        }
      }
    };

    initializeConnection();

    return () => {
      mounted = false;
      isInitializing.current = false;
    };
  }, []); // Remove socketUrl dependency to prevent reinitializing

  // Load directory contents with deduplication
  const loadDirectory = useCallback(async (path: string): Promise<FileInfo[]> => {
    const requestKey = `dir:${path}`;
    
    // Check cache first
    if (directoryCache.current[path]) {
      return directoryCache.current[path];
    }
    
    // Check if request is already pending
    if (pendingRequests.current.has(requestKey)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (directoryCache.current[path]) {
            clearInterval(checkInterval);
            resolve(directoryCache.current[path]);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve([]);
        }, 5000);
      });
    }

    try {
      pendingRequests.current.add(requestKey);
      console.log("Loading directory:", path);
      
      const response: DirContentResponse | null = await fsSocket.sendMessage(
        FS_LOAD_DIR,
        { path },
        socketUrl
      );

      // Normalize response.files to an array to avoid null/undefined
      const responseFiles: FileInfo[] = Array.isArray(response?.files) ? response!.files : [];

      // Cache the result
      directoryCache.current[path] = responseFiles;

      // Update file tree with new directory contents
      setFileTree((prevTree: any) => {
        const newTree = { ...prevTree };
        
        // Navigate to the directory in the tree and update its children
        const pathParts = path.split('/').filter(Boolean);
        let current = newTree;
        
        for (const part of pathParts) {
          if (current[part] && current[part].children) {
            current = current[part].children;
          } else {
            return prevTree; // Path not found, return unchanged
          }
        }
        
        // Update children with new files, but build them relative to the
        // directory we just loaded. This prevents re-inserting the same
        // directory as a child of itself (which caused the infinite nesting).
        const buildChildrenForPath = (files: any[], basePath: string) => {
          const children: any = {};
          const baseParts = basePath.split('/').filter(Boolean);

          for (const f of files) {
            const parts = f.path.split('/').filter(Boolean);
            const relParts = parts.slice(baseParts.length);
            if (relParts.length === 0) continue; // same dir

            // walk/create nested folders inside children map
            let nodeRef = children;
            for (let i = 0; i < relParts.length; i++) {
              const part = relParts[i];
              if (i === relParts.length - 1) {
                // final part -> actual file/dir node
                nodeRef[part] = {
                  type: f.isDir ? 'folder' : 'file',
                  children: f.isDir ? {} : undefined,
                  path: f.path,
                  size: f.size,
                  modTime: f.modTime,
                  isDir: f.isDir
                };
              } else {
                if (!nodeRef[part]) {
                  nodeRef[part] = {
                    type: 'folder',
                    children: {},
                    path: baseParts.concat(relParts.slice(0, i + 1)).join('/'),
                    isDir: true
                  };
                }
                nodeRef = nodeRef[part].children;
              }
            }
          }
          return children;
        };

  const updatedChildren = buildChildrenForPath(responseFiles, path);

        // Replace/merge child entries by name to avoid nesting a directory
        // under itself; this will update existing child nodes for the
        // directory and add new ones.
        for (const [childName, childNode] of Object.entries(updatedChildren)) {
          current[childName] = childNode;
        }
        
        return newTree;
      });
      
  console.log("Directory loaded:", path, responseFiles.length, "items");
  return responseFiles;
      
    } catch (err) {
      console.error("Failed to load directory:", path, err);
      throw err;
    } finally {
      pendingRequests.current.delete(requestKey);
    }
  }, []); // Remove socketUrl dependency

  // Load file content with deduplication
  const loadFileContent = useCallback(async (path: string): Promise<string> => {
    const requestKey = `file:${path}`;
    
    // Check if content already exists
    if (fileContents[path] !== undefined) {
      return fileContents[path];
    }
    
    // Check if request is already pending
    if (pendingRequests.current.has(requestKey)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (fileContents[path] !== undefined) {
            clearInterval(checkInterval);
            resolve(fileContents[path]);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve('');
        }, 5000);
      });
    }

    try {
      pendingRequests.current.add(requestKey);
      console.log("Loading file content:", path);
      
      const response: FileContentResponse = await fsSocket.sendMessage(
        FS_FETCH_FILE_CONTENT, 
        { path },
        socketUrl
      );
      
      setFileContents(prev => ({ ...prev, [path]: response.content }));
      console.log("File content loaded:", path, response.content.length, "chars");
      return response.content;
      
    } catch (err) {
      console.error("Failed to load file content:", path, err);
      throw err;
    } finally {
      pendingRequests.current.delete(requestKey);
    }
  }, [fileContents]); // Only depend on fileContents

  // Save file content
  const saveFile = useCallback(async (path: string, content: string) => {
    try {
      console.log("Saving file:", path);
      // Fire-and-forget save to avoid UI blocking on server timeouts.
      try {
        await fsSocket.sendOneWay(
          FS_FILE_CONTENT_UPDATE,
          { path, content },
          socketUrl
        );
      } catch (err) {
        // Fallback to awaitable send if one-way fails (connection issues);
        // still allow the outer try/catch to handle reporting.
        console.warn('sendOneWay failed, falling back to sendMessage', err);
        await fsSocket.sendMessage(
          FS_FILE_CONTENT_UPDATE,
          { path, content },
          socketUrl
        );
      }
      
  // Update local content cache immediately
  setFileContents(prev => ({ ...prev, [path]: content }));
  console.log("File saved (sent):", path);
      
    } catch (err) {
      console.error("Failed to save file:", path, err);
      throw err;
    }
  }, []); // Remove socketUrl dependency

  // Create new file or directory with optimistic update
  const createFile = useCallback(async (path: string, isDir: boolean, content?: string) => {
    try {
      console.log("Creating file:", path, isDir ? "(directory)" : "(file)");
      
      // OPTIMISTIC UPDATE: Update local state immediately
      const parentPath = path.split('/').slice(0, -1).join('/') || '';
      const fileName = path.split('/').pop() || '';
      
      // Update directory cache optimistically (keep shape consistent)
      if (directoryCache.current[parentPath]) {
        const currentDir = directoryCache.current[parentPath];
        // convert to map-like object if it's an array
        if (Array.isArray(currentDir)) {
          // rebuild as map keyed by filename
          const map: any = {};
          for (const f of currentDir) {
            const key = (f.path.split('/').pop() || '');
            map[key] = f;
          }
          directoryCache.current[parentPath] = map;
        }
        directoryCache.current[parentPath] = {
          ...directoryCache.current[parentPath],
          [fileName]: isDir ? { 
            type: 'folder', 
            children: {},
            path
          } : { 
            type: 'file',
            size: content?.length || 0,
            modTime: new Date().toISOString(),
            path,
            isDir: false
          }
        };
      }

      // If it's a file with content, update content cache optimistically
      if (!isDir && content !== undefined) {
        setFileContents(prev => ({ ...prev, [path]: content }));
      }

      // Insert into the nested fileTree so consumers see changes
  setFileTree((prev: any) => insertNodeAtPath(prev, path, {
        type: isDir ? 'folder' : 'file',
        children: isDir ? {} : undefined,
        path,
        size: !isDir ? (content?.length || 0) : undefined,
        modTime: new Date().toISOString(),
        isDir
  }));
      
      // Send to server (fire and forget for better UX)
      fsSocket.sendMessage(
        FS_NEW_FILE, 
        { path, isDir, content },
        socketUrl
      ).catch(err => {
        console.error("Failed to create file on server:", path, err);
        // TODO: Revert optimistic update on failure
        // rollback: remove from dir cache and tree
        if (directoryCache.current[parentPath]) {
          if (Array.isArray(directoryCache.current[parentPath])) {
            // convert back to map without the file
            const map = (directoryCache.current[parentPath] as any[]).reduce((acc: any, f: any) => { acc[f.path.split('/').pop()] = f; return acc; }, {});
            delete map[fileName];
            directoryCache.current[parentPath] = map;
          } else {
            const dc: any = { ...(directoryCache.current[parentPath] as any) };
            delete dc[fileName];
            directoryCache.current[parentPath] = dc;
          }
        }
        if (!isDir) {
          setFileContents(prev => {
            const newContents = { ...prev };
            delete newContents[path];
            return newContents;
          });
        }
  setFileTree((prev: any) => deleteNodeAtPath(prev, path));
      });
      
      console.log("File created locally:", path);
      
    } catch (err) {
      console.error("Failed to create file:", path, err);
      throw err;
    }
  }, []); // Remove socketUrl dependency
  
  // Delete file or directory with optimistic update
  const deleteFile = useCallback(async (path: string) => {
    try {
      console.log("Deleting file:", path);
      
      // OPTIMISTIC UPDATE: Update local state immediately
  // Snapshot original tree for rollback
  const originalFileTree = JSON.parse(JSON.stringify(fileTree || {}));
  const originalDirCache = directoryCache.current[path.split('/').slice(0, -1).join('/') || ''];
      const parentPath = path.split('/').slice(0, -1).join('/') || '';
      const fileName = path.split('/').pop() || '';
      
      // Backup current state for potential rollback
      const backupDirCache = directoryCache.current[parentPath] ? 
        { ...directoryCache.current[parentPath] } : null;
      const backupFileContent = fileContents[path];
      
      // Update directory cache optimistically
      if (directoryCache.current[parentPath]) {
        if (Array.isArray(directoryCache.current[parentPath])) {
          const map = (directoryCache.current[parentPath] as any[]).reduce((acc: any, f: any) => { acc[f.path.split('/').pop()] = f; return acc; }, {});
          if (map[fileName]) delete map[fileName];
          directoryCache.current[parentPath] = map;
        } else {
          const dc: any = { ...(directoryCache.current[parentPath] as any) };
          if (dc[fileName]) delete dc[fileName];
          directoryCache.current[parentPath] = dc;
        }
      }

      // Remove from content cache
      setFileContents(prev => {
        const newContents = { ...prev };
        delete newContents[path];
        return newContents;
      });

      // Remove from nested fileTree so consumers re-render
  setFileTree((prev: any) => deleteNodeAtPath(prev, path));
      
      // Send to server (fire and forget for better UX)
      fsSocket.sendMessage(
        FS_DELETE_FILE, 
        { path },
        socketUrl
      ).catch(err => {
        console.error("Failed to delete file on server:", path, err);
        // Rollback optimistic update on failure
        if (backupDirCache) {
          directoryCache.current[parentPath] = backupDirCache;
        } else if (originalDirCache) {
          directoryCache.current[parentPath] = originalDirCache;
        }
        if (backupFileContent !== undefined) {
          setFileContents(prev => ({ ...prev, [path]: backupFileContent }));
        }
        // restore node from the snapshot of fileTree we captured earlier
        const originalNode = getNodeAtPath(originalFileTree, path) || { type: 'file', path };
        setFileTree((prev: any) => insertNodeAtPath(prev, path, originalNode));
      });
      
      console.log("File deleted locally:", path);
      
    } catch (err) {
      console.error("Failed to delete file:", path, err);
      throw err;
    }
  }, []); // Remove socketUrl dependency

  // Rename/move file
  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
  // Store original state for potential rollback (deep copy)
  const originalFileTree = JSON.parse(JSON.stringify(fileTree || {}));
  const originalFileContents = { ...fileContents };
    
    try {
      console.log("Renaming file:", oldPath, "->", newPath);
      
      // Optimistic update: Update file tree immediately
      const oldParentPath = oldPath.split('/').slice(0, -1).join('/');
      const newParentPath = newPath.split('/').slice(0, -1).join('/');
      const fileName = oldPath.split('/').pop();
      const newFileName = newPath.split('/').pop();
      
  // Move the node in the nested tree so consumers re-render
  setFileTree((prev: any) => moveNode(prev, oldPath, newPath));
      
      // Update content cache optimistically
      setFileContents(prev => {
        const newContents = { ...prev };
        if (newContents[oldPath] !== undefined) {
          newContents[newPath] = newContents[oldPath];
          delete newContents[oldPath];
        }
        return newContents;
      });
      
      // Send request to server
      await fsSocket.sendMessage(
        FS_EDIT_FILE_META, 
        { oldPath, newPath },
        socketUrl
      );
      
  // Clear directory caches for both old and new parent directories
  if (directoryCache.current[oldParentPath]) delete directoryCache.current[oldParentPath];
  if (directoryCache.current[newParentPath]) delete directoryCache.current[newParentPath];
      
      console.log("File renamed:", oldPath, "->", newPath);
      
    } catch (err) {
      console.error("Failed to rename file:", oldPath, err);
      
      // Rollback on failure - restore original state
    setFileTree(originalFileTree);
    setFileContents(originalFileContents);
      
      throw err;
    }
  }, [fileTree, fileContents]); // Add dependencies for optimistic updates

  return {
    isConnected,
    connectionError,
    fileTree: memoizedFileTree,
    fileContents,
    loading,
    error,
    loadDirectory,
    loadFileContent,
    saveFile,
    createFile,
    deleteFile,
    renameFile,
  };
};