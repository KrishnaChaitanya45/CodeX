"use client"
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import '../../styles/terminal.css';
import { ProjectParams } from '@/constants/FS_MessageTypes';
import { buildPtyUrl } from '@/lib/pty';
import { dlog } from '@/utils/debug';

const TerminalComponent = ({ params, terminalId }: { params: ProjectParams; terminalId?: string }) => {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const instanceId = terminalId || 'default';

  useEffect(() => {
    if (!terminalRef.current || typeof window === 'undefined') return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      lineHeight: 1.2,
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e7eb',
        cursor: '#06b6d4',
        cursorAccent: '#0a0a0a',
        selectionBackground: 'rgba(255, 255, 255, 0.2)',
        black: '#000000',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f3f4f6',
        brightBlack: '#6b7280',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
      scrollback: 1000,
      rightClickSelectsWord: true,
      cols: 80,
      rows: 24,
      disableStdin: false,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    terminalInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    term.open(terminalRef.current);
    
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    const cleanupResize = () => {
      window.removeEventListener('resize', handleResize);
    };


    const labId = params?.labId;
    if (!labId || labId === '') {
      term.writeln('\x1b[31mNo lab ID provided. Terminal unavailable.\x1b[0m');
      return;
    }

    let currentSocket: WebSocket | null = null;
    let isReconnecting = false;
    let reconnectionAttempts = 0;
    const maxReconnectionAttempts = 5;
    const reconnectionDelay = 2000;
    let messageTimeout: NodeJS.Timeout | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let currentCommand = ''; // Store the current command being typed

    const sendDataToServer = (data: string) => {
      const message = JSON.stringify({
        type: 'input',
        data: data
      });
      if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.send(message);
      }
    };

    //! TODO : COME UP WITH A BETTER APPROACH
    const isBlockedCommand = (command: string) => {
      const trimmedCommand = command.trim();
      const blockedCommands = [
        'env', 'printenv', 'export', 'set', 'declare', 'unset', 'readonly', 'exit', 'kill', 'shutdown'
      ];

      // Check exact matches
      if (blockedCommands.includes(trimmedCommand)) {
        return true;
      }

      // Check commands that start with blocked prefixes
      for (const blocked of blockedCommands) {
        if (trimmedCommand.startsWith(blocked + ' ')) {
          return true;
        }
      }

      return false;
    };
    
    const onData = (data: string) => {
      dlog("DATA ENTERED", data)
      if (data == "\r" || data == "\n") {
        if (isBlockedCommand(currentCommand)) {
          dlog('Command blocked:', currentCommand);
    
          term.write('\r\x1b[K');
          term.writeln('\x1b[31m🤡   Nice Try Diddy \x1b[0m');
          term.reset()

          currentCommand = ''; 
          return; 
        }
        
        if (currentCommand.trim() === 'clear') {
          term.reset();

          sendDataToServer(data); 
          currentCommand = ''; 
          return;
        }

        sendDataToServer(data);
        currentCommand = '';
        return;
      }

      if (data === '\x7f' || data === '\b') {
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
        }
        sendDataToServer(data);
        return;
      }

      if (data >= ' ' && data <= '~') {
        currentCommand += data;
      }

      sendDataToServer(data);
    };
    term.onData(onData);
    
    const createSocket = () => {
      try {
        const ptyUrl = buildPtyUrl(labId);
        currentSocket = new WebSocket(ptyUrl);
        setupSocketHandlers();
      } catch (e) {
        console.error('Terminal socket creation error', e);
      }
    };

    const setupSocketHandlers = () => {
      if (!currentSocket) return;

      currentSocket.onopen = () => {
        setIsConnected(true);
        
        if (isReconnecting) {
          term.writeln('\x1b[32m✓ Reconnected to terminal.\x1b[0m');
          isReconnecting = false;
          reconnectionAttempts = 0;
          if (messageTimeout) {
            clearTimeout(messageTimeout);
            messageTimeout = null;
          }
        } else {
          term.writeln('\x1b[36m┌─────────────────────────────────────────┐\x1b[0m');
          term.writeln('\x1b[36m│\x1b[0m \x1b[1;33m🚀  Welcome to DevsArena Terminal!  \x1b[0m     \x1b[36m│\x1b[0m');
          term.writeln('\x1b[36m│\x1b[0m \x1b[32mYour secure coding environment is ready\x1b[0m \x1b[36m│\x1b[0m');
          term.writeln('\x1b[36m└─────────────────────────────────────────┘\x1b[0m');
          term.writeln('');
        }

        heartbeatInterval = setInterval(() => {
          if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            currentSocket.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000);
      };

      currentSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output') {
            // Skip displaying clear command output since we handle it locally
            if (message.data && !message.data.includes('clear')) {
              term.write(message.data);
            }
          } else if (message.type === 'heartbeat') {
            // Respond to heartbeat from server
            if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
              currentSocket.send(JSON.stringify({ type: 'heartbeat_response' }));
            }
          } else if (message.type === 'heartbeat_response') {
            // Handle heartbeat response silently
          }
        } catch {
          // Fallback for plain text messages
          const data = event.data;
          // Skip displaying clear command output
          if (data && !data.includes('clear')) {
            term.write(data);
          }
        }
      };

      currentSocket.onclose = (event) => {
        setIsConnected(false);
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        if (event.code !== 1000) {
          isReconnecting = true;
          reconnectionAttempts++;

          if (reconnectionAttempts <= maxReconnectionAttempts) {
            messageTimeout = setTimeout(() => {
              if (isReconnecting) {
                term.writeln('');
                term.writeln('\x1b[33m⚠ Connection lost. Attempting to reconnect...\x1b[0m');
              }
            }, 1000);

            setTimeout(() => {
              if (isReconnecting) {
                createSocket();
              }
            }, reconnectionDelay);
          } else {
            term.writeln('');
            term.writeln('\x1b[31m✗ Failed to reconnect after multiple attempts.\x1b[0m');
            term.writeln('\x1b[33mPlease refresh the page to restore connection.\x1b[0m');
            isReconnecting = false;
          }
        }
      };

      currentSocket.onerror = (error) => {
        term.writeln('\x1b[31m✗ Terminal connection error occurred.\x1b[0m');
      };
    };

    createSocket();

    return () => {
      cleanupResize();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
      try {
        if (currentSocket) {
          currentSocket.close();
        }
      } catch {}
      try {
        term.dispose();
      } catch {}
    };
  }, [params?.labId]);

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-300">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Lab: {params?.labId} {instanceId !== 'default' && `• ${instanceId}`}
        </div>
      </div>
      
      {/* Terminal Container */}
      <div 
        ref={terminalRef} 
        className="flex-1 w-full h-full overflow-hidden"
        style={{ 
          minHeight: 0,
          minWidth: 0,
        }}
      />
    </div>
  );
};

export default TerminalComponent;