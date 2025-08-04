import React, { FC } from 'react';

type RunControlsProps = {
  onRun: () => void;
  onSubmit: () => void;
};

const RunControls: FC<RunControlsProps> = ({ onRun, onSubmit }) => (
  <div className="flex gap-2 p-2 border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
    <button
      onClick={onRun}
      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
    >
      Run
    </button>
    <button
      onClick={onSubmit}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
    >
      Submit
    </button>
  </div>
);

export default RunControls;
