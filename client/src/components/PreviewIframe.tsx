import React, { FC } from 'react';

type PreviewProps = {
  srcDoc: string;
};

const PreviewIframe: FC<PreviewProps> = ({ srcDoc }) => {
  return (
    <iframe
      srcDoc={srcDoc}
      frameBorder="0"
      className="w-full h-full bg-white dark:bg-gray-900"
      sandbox="allow-scripts"
    />
  );
};

export default PreviewIframe;
