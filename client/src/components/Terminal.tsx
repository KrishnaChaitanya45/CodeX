"use client"
import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css'; // Import the CSS for styling
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });


    
  
const TerminalComponent = () => {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    term.open(terminalRef.current);
    

    // --- WebSocket Connection ---
    // Use wss:// for secure connections (HTTPS)
    const socket = new WebSocket('ws://test.quest.arenas.devsarena.in/pty');

    // When the connection opens, print a welcome message
    socket.onopen = () => {
      term.writeln('Welcome to the interactive terminal!');
      term.writeln('');
    };

    // When a message is received from the Go backend, write it to the terminal
    socket.onmessage = (event) => {
      term.write(event.data);
    };

    // When the user types in the terminal, send the data to the Go backend
    term.onData((data) => {
      // Your Go backend expects a JSON object with a "data" key
      const message = JSON.stringify({ data: data });
      socket.send(message);
    });

    // Handle connection closing
    socket.onclose = () => {
      term.writeln('');
      term.writeln('Connection closed.');
    };

    // Handle errors
    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      term.writeln('An error occurred with the connection.');
    };

    // Clean up on component unmount
    return () => {
      socket.close();
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default TerminalComponent;