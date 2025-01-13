import { useState, useEffect } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Link } from 'react-router-dom';

function Problems() {
  const [problems, setProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const problemFiles = [];

    // Dynamically import all .md files in the ../problems directory
    const files = import.meta.glob('../problems/*.md');

    for (const path in files) {
      problemFiles.push({
        code: path.split('/').pop().replace('.md', '').replace(/-/g, ' '),
        name: path.split('/').pop().replace('.md', '').replace(/-/g, ' '),
        difficulty: 'Easy',  // Placeholder
        submissions: Math.floor(Math.random() * 1000),  // Random for now
      });
    }

    setProblems(problemFiles);
  }, []);


  const filteredProblems = problems.filter((problem) =>
    problem.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    problem.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen my-0">
      <Header />
      <main className="flex-1" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1D2125' }}>
        <h1 className='text-white' style={{ textAlign: 'center', marginBottom: '30px' }}>Problems</h1>
        <input
          type="text"
          placeholder="Search by Code or Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='form-control mb-4 mx-auto'
          style={{ width: '50%'}}
        />
        <table className='table table-bordered table-striped table-hover' style={{ margin: 'auto', borderRadius: '8px', overflow: 'hidden', width: '65%' }}>
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
        </table>
      </main>
      <Footer />
    </div>
  );
}

export default Problems;

{/* <Form.Control
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
        </Table> */}