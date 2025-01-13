//src/pages/ProblemPage.js

import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Header from '../components/Header.jsx';

function ProblemPage() {
  const { problemId } = useParams();  // Grabs problem name from URL
  const [content, setContent] = useState('Loading...');

  useEffect(() => {
    // Dynamically load the markdown file
    import(`../problems/${problemId}.md`)
      .then((res) => fetch(res.default).then((res) => res.text()))
      .then((text) => setContent(text))
      .catch(() => setContent('Problem not found.'));
  }, [problemId]);

  return (
    <div>
      <Header/>
      <div style={{ padding: '20px' }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default ProblemPage;
