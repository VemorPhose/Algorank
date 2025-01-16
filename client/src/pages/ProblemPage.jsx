// src/pages/ProblemPage.jsx

import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';

function ProblemPage() {
  const { problemId } = useParams();
  const [content, setContent] = useState('Loading...');
  const [code, setCode] = useState('// Start coding here...');
  const [language, setLanguage] = useState('cpp');

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch(`/problems/${problemId}.md`);
        if (!response.ok) throw new Error('File not found');
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error("Error fetching markdown:", error);
        setContent('Problem not found.');
      }
    };

    fetchMarkdown();
  }, [problemId]);

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const getLanguageExtension = () => {
    switch (language) {
      case 'python':
        return python();
      case 'java':
        return java();
      case 'c':
      case 'cpp':
      default:
        return cpp();
    }
  };

  return (
    <div className="flex flex-col min-h-screen my-0">
      <Header />

      <main className="flex flex-1 bg-gray-900 text-white p-4">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 p-4 overflow-y-auto border-r border-gray-700">
          <h2 className="text-2xl font-bold mb-4">{problemId.replace(/-/g, ' ').toUpperCase()}</h2>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Right Panel - IDE */}
        <div className="w-1/2 p-4">
          <div className="mb-4">
            <label htmlFor="language" className="block mb-2 text-sm font-medium">
              Select Language:
            </label>
            <select
              id="language"
              value={language}
              onChange={handleLanguageChange}
              className="p-2 rounded bg-gray-800 text-white border border-gray-600"
            >
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>

          <CodeMirror
            value={code}
            height="400px"
            extensions={[getLanguageExtension()]}
            onChange={(value) => setCode(value)}
            className="border border-gray-600 rounded text-black"
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ProblemPage;
