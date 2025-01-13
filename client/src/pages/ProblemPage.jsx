// src/pages/ProblemPage.js

import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

function ProblemPage() {
  const { problemId } = useParams();
  const [content, setContent] = useState('Loading...');

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

  return (
    <div className="flex flex-col min-h-screen my-0">
      <Header />
      <main className="flex-1 text-white" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1D2125' }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </main>
      <Footer />
    </div>
  );
}

export default ProblemPage;
