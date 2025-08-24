"use client";
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye,
  RotateCcw,
  Download
} from 'lucide-react';

interface PreviewPanelProps {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

export function PreviewPanel({ 
  htmlContent, 
  cssContent, 
  jsContent, 
  onExport 
}: PreviewPanelProps) {
  const iFrameRef = useRef<HTMLIFrameElement | null>(null);

  function onRefresh() {
    // Trigger a refresh of the preview
    //refresh the iframe and reload the page
    if (iFrameRef.current) {
      iFrameRef.current.contentWindow?.location.reload();
    }
  }

  return (
    <div className="h-full bg-white">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 border-b border-purple-600/30 flex items-center justify-between">
        <div className="flex items-center">
          <Eye className="w-4 h-4 mr-2 text-purple-400" />
          <span className="text-white font-medium">Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Refresh Preview"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={()=>{
              window.open('http://test.quest.arenas.devsarena.in/','_blank');
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Export Project"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      <iframe
        src='http://test.quest.arenas.devsarena.in/'
        className="w-full h-full border-none"
      
      />
    </div>
  );
}
