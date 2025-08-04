import React, { FC } from 'react';
import Editor, { OnChange } from '@monaco-editor/react';

type CodeEditorProps = {
  language: string;
  value: string;
  onChange: (value: string) => void;
};

const CodeEditor: FC<CodeEditorProps> = ({ language, value, onChange }) => {
  const handleChange: OnChange = (val) => {
    onChange(val || '');
  };

  return (
    <div className="h-full bg-gray-800">
      <Editor
        height="100%"
        theme="vs-dark"
        defaultLanguage={language}
        value={value}
        onChange={handleChange}
        options={{ automaticLayout: true }}
      />
    </div>
  );
};

export default CodeEditor;
