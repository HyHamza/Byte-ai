import React, { useState, useMemo } from 'react';
import { AppFile } from '../types';

// Declare JSZip for TypeScript since it's loaded from a CDN
declare const JSZip: any;

interface AppPreviewProps {
  files: AppFile[];
}

const generateSrcDoc = (files: AppFile[]): string => {
    const htmlFile = files.find(f => f.fileName.toLowerCase() === 'index.html');
    if (!htmlFile) {
        return '<html><body><h1>index.html not found</h1></body></html>';
    }

    let htmlContent = htmlFile.content;

    // Find and inject CSS
    const cssLinks = htmlContent.match(/<link.*?href="(.*?.css)".*?>/g) || [];
    cssLinks.forEach(linkTag => {
        const hrefMatch = linkTag.match(/href="(.*?)"/);
        if (hrefMatch) {
            const cssFileName = hrefMatch[1];
            const cssFile = files.find(f => f.fileName === cssFileName);
            if (cssFile) {
                const styleTag = `<style>${cssFile.content}</style>`;
                htmlContent = htmlContent.replace(linkTag, styleTag);
            }
        }
    });

    // Find and inject JS
    const scriptTags = htmlContent.match(/<script.*?src="(.*?.js)".*?>.*?<\/script>/g) || [];
    scriptTags.forEach(scriptTag => {
        const srcMatch = scriptTag.match(/src="(.*?)"/);
        if (srcMatch) {
            const jsFileName = srcMatch[1];
            const jsFile = files.find(f => f.fileName === jsFileName);
            if (jsFile) {
                const newScriptTag = `<script>${jsFile.content}<\/script>`;
                htmlContent = htmlContent.replace(scriptTag, newScriptTag);
            }
        }
    });

    return htmlContent;
};


const AppPreview: React.FC<AppPreviewProps> = ({ files }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [selectedFile, setSelectedFile] = useState(files.find(f => f.fileName.toLowerCase() === 'index.html') || files[0]);

  const srcDoc = useMemo(() => generateSrcDoc(files), [files]);

  const handleDownloadZip = () => {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.fileName, file.content);
    });
    zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'application.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg my-4 overflow-hidden">
        <div className="bg-gray-700 p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
                 <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 text-sm rounded ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>Preview</button>
                 <button onClick={() => setActiveTab('code')} className={`px-3 py-1 text-sm rounded ${activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>Code</button>
            </div>
             <button onClick={handleDownloadZip} className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 hover:bg-green-500 rounded text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Download ZIP
             </button>
        </div>

        {activeTab === 'preview' ? (
            <iframe
                srcDoc={srcDoc}
                title="Application Preview"
                sandbox="allow-scripts allow-modals"
                className="w-full h-96 border-0"
            />
        ) : (
            <div>
                 <div className="p-2 bg-gray-900 flex-wrap flex gap-1">
                    {files.map(file => (
                        <button key={file.fileName} onClick={() => setSelectedFile(file)} className={`px-2 py-1 text-xs rounded ${selectedFile.fileName === file.fileName ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            {file.fileName}
                        </button>
                    ))}
                 </div>
                 <pre className="p-4 text-sm bg-gray-800 h-96 overflow-auto"><code className="text-white whitespace-pre-wrap">{selectedFile.content}</code></pre>
            </div>
        )}
    </div>
  );
};

export default AppPreview;
