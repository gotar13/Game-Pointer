import { useState, useEffect } from 'react';

function App() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Game Pointer</h1>
      <h2>Teams from MongoDB Atlas</h2>
      
      {loading && <p>Loading teams...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {teams.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {teams.map(team => (
            <li key={team._id} style={{
              padding: '10px',
              margin: '10px 0',
              backgroundColor: '#f0f0f0',
              borderRadius: '5px',
              border: '1px solid #ccc'
            }}>
              <strong>{team.name}</strong> - Score: {team.totalScore}
            </li>
          ))}
        </ul>
      ) : (
        !loading && <p>No teams found</p>
      )}
    </div>
  );
}

export default App;
