import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function UserPage({ user, onLogout }) {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Fetch teams data on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        fetch(`${apiUrl}/teams`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Unauthorized');
                return res.json();
            })
            .then(data => {
                setTeams(data);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load teams');
                setLoading(false);
            });
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
        navigate('/login');
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>🎮 Game Pointer - User Dashboard</h1>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#d32f2f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Logout
                </button>
            </div>

            <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
                Welcome, <strong>{user?.username}</strong>! ✅
            </p>

            <h2>Teams</h2>
            {error && <p style={{ color: '#d32f2f' }}>⚠️ {error}</p>}
            {loading && <p>Loading teams...</p>}

            {teams.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {teams.map(team => (
                        <li key={team._id} style={{
                            padding: '15px',
                            margin: '10px 0',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '5px',
                            border: '1px solid #ddd',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <strong>{team.name}</strong> - Score: <span style={{ color: '#1976d2', fontWeight: 'bold' }}>{team.totalScore}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                !loading && !error && <p>No teams found</p>
            )}
        </div>
    );
}
