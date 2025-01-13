import React, { useState, useEffect } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import Table from 'react-bootstrap/Table';
import { Link } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';

function Problems() {
  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      const context = require.context('../problems', false, /\.md$/);
      const problemFiles = context.keys().map((file) => {
        if (file) {
          return {
            code: file.replace('./', '').replace('.md', '').replace(/-/g, ' '),
            name: file.replace('./', '').replace('.md', '').replace(/-/g, ' '),
            difficulty: 'Easy',  // Placeholder
            submissions: Math.floor(Math.random() * 1000),  // Random for now
          };
        } else {
          console.warn("Undefined file detected:", file);
          return null;
        }
      }).filter(Boolean);

      setProblems(problemFiles);
    } catch (error) {
      console.error("Error loading problem files:", error);
    }
  }, []);

  const filteredProblems = problems.filter((problem) =>
    problem.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    problem.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', color: '#ffffff' }}>
      <Header />
      <Container style={{ padding: '20px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Problems</h1>
        <Form.Control
          type="text"
          placeholder="Search by Code or Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: '20px', width: '50%', marginLeft: 'auto', marginRight: 'auto' }}
        />
        <Table striped hover variant="dark" responsive style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={{ width: '20%', textAlign: 'center' }}>Code</th>
              <th style={{ width: '40%', textAlign: 'center' }}>Name</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Difficulty</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Submissions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((problem) => (
              <tr key={problem.code}>
                <td style={{ textAlign: 'center' }}>{problem.code}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/problem/${problem.code}`} style={{ color: '#4da6ff' }}>{problem.name}</Link>
                </td>
                <td style={{ textAlign: 'center' }}>{problem.difficulty}</td>
                <td style={{ textAlign: 'center' }}>{problem.submissions}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Container>
      <Footer />
    </div>
  );
}

export default Problems;
