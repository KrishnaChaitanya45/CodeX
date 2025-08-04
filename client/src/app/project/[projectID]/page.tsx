"use client";
import React, { useState, useEffect } from "react";
import ResizableSidebar from "@/components/ResizableSidebar";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import PreviewIframe from "@/components/PreviewIframe";
import RunControls from "@/components/RunControls";
import Tabs from "@/components/Tabs";
import SplitPane from "@/components/SplitPane";

const defaultFiles = ["index.html", "styles.css", "script.js"];
const defaultContents: Record<string, string> = {
  "index.html": "<h1>Hello, World!</h1>",
  "styles.css": "body { font-family: sans-serif; margin: 0; padding: 1rem; }",
  "script.js": "console.log('Hello, World!');",
};

type Params = {
  params: Promise<{
    projectID: string;
  }>;
};

const getLanguage = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "css":
      return "css";
    case "html":
      return "html";
    default:
      return "plaintext";
  }
};

export default function ProjectPage({ params }: Params) {
  const [projectID, setProjectID] = useState<string>("");
  const [files, setFiles] = useState<string[]>(defaultFiles);
  const [contents, setContents] = useState<Record<string, string>>(defaultContents);
  const [activeFile, setActiveFile] = useState<string>(defaultFiles[0]);
  const [srcDoc, setSrcDoc] = useState<string>("");

  useEffect(() => {
    params.then(({ projectID }) => setProjectID(projectID));
  }, [params]);

  const handleSelect = (file: string) => setActiveFile(file);

  const handleCreate = (filename: string) => {
    if (!files.includes(filename)) {
      setFiles([...files, filename]);
      setContents({ ...contents, [filename]: "" });
      setActiveFile(filename);
    }
  };

  const handleContentChange = (value: string) => {
    setContents((prev) => ({ ...prev, [activeFile]: value }));
  };

  const handleRun = () => {
    const html = contents["index.html"] || "";
    const css = `<style>${contents["styles.css"] || ""}</style>`;
    const js = `<script>${contents["script.js"] || ""}</script>`;
    setSrcDoc(`<!DOCTYPE html><html><head>${css}</head><body>${html}${js}</body></html>`);
  };

  const handleSubmit = () => {
    // TODO: implement submission logic, e.g., send contents to server
    console.log("Submit project", projectID, contents);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      {/* File Explorer Sidebar */}
      <ResizableSidebar>
        <FileExplorer
          files={files}
          activeFile={activeFile}
          onSelect={handleSelect}
          onCreate={handleCreate}
        />
      </ResizableSidebar>

      {/* Draggable Editor/Preview Split */}
      <SplitPane initialLeftWidth={800} minLeftWidth={500} maxLeftWidth={1200}>
        <div className="flex flex-col h-full">
          <Tabs files={files} activeFile={activeFile} onSelect={handleSelect} />
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              language={getLanguage(activeFile)}
              value={contents[activeFile] || ""}
              onChange={handleContentChange}
            />
          </div>
          <RunControls onRun={handleRun} onSubmit={handleSubmit} />
        </div>
        <div className="h-full bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700">
          <PreviewIframe srcDoc={srcDoc} />
        </div>
      </SplitPane>
    </div>
  );
}
