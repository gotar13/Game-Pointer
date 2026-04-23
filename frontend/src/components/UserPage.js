import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

const COLORS = {
    primary: '#877643',
    secondary: '#5a4f32',
    dark: '#2c2416',
    light: '#faf8f3',
    accent: '#ff9800',
    danger: '#d32f2f',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3'
};

export default function UserPage({ user, onLogout }) {
    const [tasks, setTasks] = useState([]);
    const [teams, setTeams] = useState([]);
    const [submittedScores, setSubmittedScores] = useState([]);
    const [userHistory, setUserHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [scoringTaskId, setScoringTaskId] = useState(null);
    const [scoreForm, setScoreForm] = useState({ teamId: '', points: '' });
    const [collapsedDays, setCollapsedDays] = useState({});
    const [collapsedCategories, setCollapsedCategories] = useState({});
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const getApiUrl = (endpoint) => {
        // Use relative URL for AWS/production compatibility
        // Falls back to environment variable if set (e.g., for cross-origin requests)
        const baseUrl = process.env.REACT_APP_API_URL || '/api';

        // If baseUrl is a full URL (with http/https), use as-is
        if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
            if (baseUrl.endsWith('/api') || baseUrl.endsWith('/api/')) {
                const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
                return `${cleanBase}${endpoint}`;
            }
            return `${baseUrl}/api${endpoint}`;
        }

        // For relative URLs, just append endpoint
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}${endpoint}`;
    };

    const loadTasks = useCallback(async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const url = getApiUrl('/tasks/my-tasks');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    navigate('/login');
                    return;
                }
                throw new Error('Failed to load tasks');
            }

            const data = await response.json();
            setTasks(data);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }, [token, navigate]);

    const loadTeams = useCallback(async () => {
        if (!token) return;
        try {
            const url = getApiUrl('/teams');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTeams(data);
            }
        } catch (err) {
            console.error('Failed to load teams:', err);
        }
    }, [token]);

    const loadScores = useCallback(async () => {
        if (!token) return;
        try {
            const url = getApiUrl('/my-scores');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSubmittedScores(data);
            }
        } catch (err) {
            console.error('Failed to load submitted scores:', err);
        }
    }, [token]);

    const loadUserHistory = useCallback(async () => {
        if (!token) return;
        try {
            const url = getApiUrl('/user-history/my-history');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUserHistory(data.history || []);
            }
        } catch (err) {
            console.error('Failed to load user history:', err);
        }
    }, [token]);

    const submitScore = async (taskId) => {
        if (!scoreForm.teamId || scoreForm.points === '') {
            setError('Please select a team and enter points');
            return;
        }

        try {
            const url = getApiUrl('/user-scores');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    taskId,
                    teamId: scoreForm.teamId,
                    points: parseInt(scoreForm.points)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to submit score');
                return;
            }

            setError('');
            setSuccess('✓ Score submitted successfully!');
            setScoringTaskId(null);
            setScoreForm({ teamId: '', points: '' });

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);

            // Reload tasks and scores to show updated state
            loadTasks();
            loadScores();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordError('All password fields are required');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }

        if (passwordForm.oldPassword === passwordForm.newPassword) {
            setPasswordError('New password must be different from current password');
            return;
        }

        setPasswordLoading(true);
        try {
            const url = getApiUrl('/change-password');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: passwordForm.oldPassword,
                    newPassword: passwordForm.newPassword,
                    confirmPassword: passwordForm.confirmPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setPasswordError(data.error || 'Failed to change password');
                setPasswordLoading(false);
                return;
            }

            setPasswordSuccess('✓ Password changed successfully!');
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setShowChangePassword(false);

            // Clear success message after 3 seconds
            setTimeout(() => setPasswordSuccess(''), 3000);
        } catch (err) {
            setPasswordError(err.message || 'An error occurred');
        } finally {
            setPasswordLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
        loadTeams();
        loadScores();
        loadUserHistory();
    }, [loadTasks, loadTeams, loadScores, loadUserHistory]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
        navigate('/login');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #877643 0%, #5a4f32 50%, #2c2416 100%)',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                <div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '32px',
                        color: '#faf8f3',
                        fontWeight: '700'
                    }}>
                        🎮 Task Dashboard
                    </h1>
                    <p style={{
                        margin: '8px 0 0 0',
                        fontSize: '14px',
                        color: '#d4af99',
                        fontWeight: '500'
                    }}>
                        Welcome, <strong>{user?.username}</strong>
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: COLORS.danger,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#b71c1c'}
                    onMouseOut={(e) => e.target.style.backgroundColor = COLORS.danger}
                >
                    🚪 Logout
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    backgroundColor: '#ffebee',
                    border: `2px solid ${COLORS.danger}`,
                    color: COLORS.danger,
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div style={{
                    backgroundColor: '#e8f5e9',
                    border: `2px solid ${COLORS.success}`,
                    color: COLORS.success,
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    {success}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={{
                    backgroundColor: COLORS.light,
                    padding: '40px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ fontSize: '16px', color: COLORS.dark, margin: 0 }}>⏳ Loading your tasks...</p>
                </div>
            )}

            {/* Tasks Grid */}
            {!loading && (
                <div>
                    <h2 style={{
                        color: '#faf8f3',
                        fontSize: '24px',
                        fontWeight: '600',
                        marginBottom: '20px',
                        marginTop: 0
                    }}>
                        📋 Your Assigned Tasks ({tasks.length})
                    </h2>

                    {tasks.length > 0 ? (
                        <div>
                            {['Day 1', 'Day 2', 'Day 3'].map(day => {
                                // Get tasks for this day
                                const dayTasks = tasks.filter(t => (t.day || 'Day 1') === day);

                                // Group by category
                                const tasksByCategory = {};
                                dayTasks.forEach(task => {
                                    const category = task.category || 'Uncategorized';
                                    if (!tasksByCategory[category]) {
                                        tasksByCategory[category] = [];
                                    }
                                    tasksByCategory[category].push(task);
                                });

                                return dayTasks.length > 0 ? (
                                    <div key={day} style={{ marginBottom: '40px' }}>
                                        <h3
                                            onClick={() => setCollapsedDays({ ...collapsedDays, [day]: !collapsedDays[day] })}
                                            style={{
                                                color: '#faf8f3',
                                                fontSize: '20px',
                                                fontWeight: '700',
                                                marginBottom: '20px',
                                                borderBottom: `3px solid ${COLORS.accent}`,
                                                paddingBottom: '10px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            <span style={{
                                                display: 'inline-block',
                                                transform: collapsedDays[day] ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.3s ease',
                                                fontSize: '16px'
                                            }}>▼</span>
                                            📅 {day} ({dayTasks.length} tasks)
                                        </h3>

                                        {!collapsedDays[day] && (
                                            <>
                                                {Object.keys(tasksByCategory).map(category => {
                                                    const categoryKey = `${day}-${category}`;
                                                    const isCategoryCollapsed = collapsedCategories[categoryKey] !== false; // Default to collapsed (true)

                                                    return (
                                                        <div key={categoryKey} style={{ marginBottom: '25px' }}>
                                                            <h4
                                                                onClick={() => setCollapsedCategories({ ...collapsedCategories, [categoryKey]: !isCategoryCollapsed })}
                                                                style={{
                                                                    color: COLORS.accent,
                                                                    fontSize: '16px',
                                                                    fontWeight: '600',
                                                                    marginBottom: '15px',
                                                                    paddingLeft: '12px',
                                                                    borderLeft: `4px solid ${COLORS.accent}`,
                                                                    cursor: 'pointer',
                                                                    userSelect: 'none',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px'
                                                                }}
                                                            >
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    transform: isCategoryCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 0.3s ease',
                                                                    fontSize: '14px'
                                                                }}>▼</span>
                                                                📂 {category} ({tasksByCategory[category].length} tasks)
                                                            </h4>

                                                            {!isCategoryCollapsed && (
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                                                    gap: '20px'
                                                                }}>
                                                                    {tasksByCategory[category].map(task => (
                                                                        <div key={task._id} style={{
                                                                            backgroundColor: COLORS.light,
                                                                            padding: '20px',
                                                                            borderRadius: '12px',
                                                                            border: `3px solid ${COLORS.accent}`,
                                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                            transition: 'all 0.3s ease',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                            onMouseOver={(e) => {
                                                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
                                                                            }}
                                                                            onMouseOut={(e) => {
                                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                                                            }}
                                                                        >
                                                                            <h3 style={{
                                                                                margin: '0 0 12px 0',
                                                                                color: COLORS.dark,
                                                                                fontSize: '18px',
                                                                                fontWeight: '700'
                                                                            }}>
                                                                                {task.name}
                                                                            </h3>

                                                                            <div style={{
                                                                                backgroundColor: '#f5f5f5',
                                                                                padding: '12px',
                                                                                borderRadius: '8px',
                                                                                marginBottom: '12px'
                                                                            }}>
                                                                                <p style={{
                                                                                    margin: '8px 0',
                                                                                    color: '#666',
                                                                                    fontSize: '14px'
                                                                                }}>
                                                                                    <strong>⭐ Points:</strong> {task.maxPoints}
                                                                                </p>
                                                                                {task.note && (
                                                                                    <p style={{
                                                                                        margin: '8px 0',
                                                                                        color: '#666',
                                                                                        fontSize: '14px',
                                                                                        fontStyle: 'italic'
                                                                                    }}>
                                                                                        <strong>📝 Note:</strong> {task.note}
                                                                                    </p>
                                                                                )}
                                                                                <p style={{
                                                                                    margin: '0',
                                                                                    color: '#999',
                                                                                    fontSize: '12px'
                                                                                }}>
                                                                                    📅 {new Date(task.createdAt).toLocaleDateString()}
                                                                                </p>
                                                                            </div>

                                                                            {task.assignedOrganizers && task.assignedOrganizers.length > 0 && (
                                                                                <div style={{
                                                                                    backgroundColor: '#e8f5e9',
                                                                                    padding: '10px',
                                                                                    borderRadius: '6px',
                                                                                    borderLeft: `4px solid ${COLORS.success}`
                                                                                }}>
                                                                                    <p style={{
                                                                                        margin: 0,
                                                                                        color: COLORS.success,
                                                                                        fontSize: '12px',
                                                                                        fontWeight: '600'
                                                                                    }}>
                                                                                        👥 Assignees: {task.assignedOrganizers.map(org => org.username).join(', ')}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {/* Score Submission Button/Form */}
                                                                            {scoringTaskId !== task._id ? (
                                                                                <button
                                                                                    onClick={() => setScoringTaskId(task._id)}
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        marginTop: '16px',
                                                                                        padding: '12px',
                                                                                        backgroundColor: COLORS.accent,
                                                                                        color: 'white',
                                                                                        border: 'none',
                                                                                        borderRadius: '8px',
                                                                                        fontSize: '14px',
                                                                                        fontWeight: '600',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.3s ease',
                                                                                        ':hover': {
                                                                                            backgroundColor: COLORS.dark
                                                                                        }
                                                                                    }}
                                                                                    onMouseOver={(e) => {
                                                                                        e.currentTarget.style.backgroundColor = COLORS.dark;
                                                                                        e.currentTarget.style.transform = 'scale(1.02)';
                                                                                    }}
                                                                                    onMouseOut={(e) => {
                                                                                        e.currentTarget.style.backgroundColor = COLORS.accent;
                                                                                        e.currentTarget.style.transform = 'scale(1)';
                                                                                    }}
                                                                                >
                                                                                    ➕ Add Points
                                                                                </button>
                                                                            ) : (
                                                                                <div style={{
                                                                                    marginTop: '16px',
                                                                                    padding: '16px',
                                                                                    backgroundColor: '#fff9f0',
                                                                                    borderRadius: '8px',
                                                                                    border: `2px solid ${COLORS.accent}`
                                                                                }}>
                                                                                    <p style={{
                                                                                        margin: '0 0 12px 0',
                                                                                        color: COLORS.dark,
                                                                                        fontSize: '14px',
                                                                                        fontWeight: '600'
                                                                                    }}>
                                                                                        Submit Score for {task.name}
                                                                                    </p>

                                                                                    <div style={{
                                                                                        marginBottom: '12px'
                                                                                    }}>
                                                                                        <label style={{
                                                                                            display: 'block',
                                                                                            marginBottom: '6px',
                                                                                            color: COLORS.dark,
                                                                                            fontSize: '13px',
                                                                                            fontWeight: '600'
                                                                                        }}>
                                                                                            Team
                                                                                        </label>
                                                                                        <select
                                                                                            value={scoreForm.teamId || ''}
                                                                                            onChange={(e) => setScoreForm({ ...scoreForm, teamId: e.target.value })}
                                                                                            style={{
                                                                                                width: '100%',
                                                                                                padding: '10px',
                                                                                                borderRadius: '6px',
                                                                                                border: `2px solid ${COLORS.accent}`,
                                                                                                fontSize: '14px',
                                                                                                backgroundColor: 'white',
                                                                                                color: COLORS.dark,
                                                                                                cursor: 'pointer',
                                                                                                fontWeight: '500'
                                                                                            }}
                                                                                        >
                                                                                            <option value="">-- Select a Team --</option>
                                                                                            {teams.map(team => (
                                                                                                <option key={team._id} value={team._id}>
                                                                                                    {team.name}
                                                                                                </option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>

                                                                                    <div style={{
                                                                                        marginBottom: '12px'
                                                                                    }}>
                                                                                        <label style={{
                                                                                            display: 'block',
                                                                                            marginBottom: '6px',
                                                                                            color: COLORS.dark,
                                                                                            fontSize: '13px',
                                                                                            fontWeight: '600'
                                                                                        }}>
                                                                                            Points (0-{task.maxPoints})
                                                                                        </label>
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            max={task.maxPoints}
                                                                                            value={scoreForm.points || ''}
                                                                                            onChange={(e) => setScoreForm({ ...scoreForm, points: parseInt(e.target.value) || 0 })}
                                                                                            style={{
                                                                                                width: '100%',
                                                                                                padding: '10px',
                                                                                                borderRadius: '6px',
                                                                                                border: `2px solid ${COLORS.accent}`,
                                                                                                fontSize: '14px',
                                                                                                boxSizing: 'border-box',
                                                                                                color: COLORS.dark,
                                                                                                fontWeight: '500'
                                                                                            }}
                                                                                            placeholder="Enter points"
                                                                                        />
                                                                                    </div>

                                                                                    <div style={{
                                                                                        display: 'flex',
                                                                                        gap: '10px'
                                                                                    }}>
                                                                                        <button
                                                                                            onClick={() => submitScore(task._id)}
                                                                                            style={{
                                                                                                flex: 1,
                                                                                                padding: '10px',
                                                                                                backgroundColor: COLORS.success,
                                                                                                color: 'white',
                                                                                                border: 'none',
                                                                                                borderRadius: '6px',
                                                                                                fontSize: '13px',
                                                                                                fontWeight: '600',
                                                                                                cursor: 'pointer',
                                                                                                transition: 'all 0.3s ease'
                                                                                            }}
                                                                                            onMouseOver={(e) => {
                                                                                                e.currentTarget.style.backgroundColor = '#388e3c';
                                                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                                            }}
                                                                                            onMouseOut={(e) => {
                                                                                                e.currentTarget.style.backgroundColor = COLORS.success;
                                                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                                            }}
                                                                                        >
                                                                                            ✓ Submit
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setScoringTaskId(null);
                                                                                                setScoreForm({ teamId: '', points: 0 });
                                                                                            }}
                                                                                            style={{
                                                                                                flex: 1,
                                                                                                padding: '10px',
                                                                                                backgroundColor: '#999',
                                                                                                color: 'white',
                                                                                                border: 'none',
                                                                                                borderRadius: '6px',
                                                                                                fontSize: '13px',
                                                                                                fontWeight: '600',
                                                                                                cursor: 'pointer',
                                                                                                transition: 'all 0.3s ease'
                                                                                            }}
                                                                                            onMouseOver={(e) => {
                                                                                                e.currentTarget.style.backgroundColor = '#666';
                                                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                                            }}
                                                                                            onMouseOut={(e) => {
                                                                                                e.currentTarget.style.backgroundColor = '#999';
                                                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                                            }}
                                                                                        >
                                                                                            ✕ Cancel
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                ) : null
                            })}
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: COLORS.light,
                            padding: '60px 40px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{
                                fontSize: '18px',
                                color: COLORS.dark,
                                margin: 0,
                                fontWeight: '500'
                            }}>
                                😊 No tasks assigned to you yet
                            </p>
                            <p style={{
                                fontSize: '14px',
                                color: '#999',
                                margin: '8px 0 0 0'
                            }}>
                                Check back later for new assignments
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* My Submitted Scores Section */}
            {!loading && (
                <div style={{
                    marginTop: '40px'
                }}>
                    <h2 style={{
                        margin: '0 0 24px 0',
                        fontSize: '24px',
                        color: '#faf8f3',
                        fontWeight: '700'
                    }}>
                        📊 My Submitted Scores
                    </h2>

                    {submittedScores.length > 0 ? (
                        <div style={{
                            overflowX: 'auto',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                backgroundColor: COLORS.light,
                                fontSize: '14px'
                            }}>
                                <thead>
                                    <tr style={{
                                        backgroundColor: COLORS.accent,
                                        color: 'white'
                                    }}>
                                        <th style={{
                                            padding: '16px',
                                            textAlign: 'left',
                                            fontWeight: '600',
                                            borderRight: '1px solid rgba(0,0,0,0.1)'
                                        }}>Task</th>
                                        <th style={{
                                            padding: '16px',
                                            textAlign: 'left',
                                            fontWeight: '600',
                                            borderRight: '1px solid rgba(0,0,0,0.1)'
                                        }}>Team</th>
                                        <th style={{
                                            padding: '16px',
                                            textAlign: 'center',
                                            fontWeight: '600',
                                            borderRight: '1px solid rgba(0,0,0,0.1)'
                                        }}>Points</th>
                                        <th style={{
                                            padding: '16px',
                                            textAlign: 'left',
                                            fontWeight: '600'
                                        }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submittedScores.map((score, idx) => (
                                        <tr key={score._id} style={{
                                            borderBottom: '1px solid #e0e0e0',
                                            backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white',
                                            transition: 'background-color 0.3s ease'
                                        }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#f9f9f9' : 'white';
                                            }}
                                        >
                                            <td style={{
                                                padding: '16px',
                                                borderRight: '1px solid #e0e0e0',
                                                fontWeight: '500',
                                                color: COLORS.dark
                                            }}>
                                                {score.taskId?.name || 'Unknown Task'}
                                            </td>
                                            <td style={{
                                                padding: '16px',
                                                borderRight: '1px solid #e0e0e0',
                                                fontWeight: '500',
                                                color: COLORS.dark
                                            }}>
                                                {score.teamId?.name || 'Unknown Team'}
                                            </td>
                                            <td style={{
                                                padding: '16px',
                                                borderRight: '1px solid #e0e0e0',
                                                textAlign: 'center',
                                                fontWeight: '700',
                                                color: COLORS.success,
                                                fontSize: '16px'
                                            }}>
                                                +{score.points}
                                            </td>
                                            <td style={{
                                                padding: '16px',
                                                color: '#666',
                                                fontSize: '13px'
                                            }}>
                                                {new Date(score.createdAt).toLocaleDateString()} {new Date(score.createdAt).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: COLORS.light,
                            padding: '40px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{
                                fontSize: '16px',
                                color: COLORS.dark,
                                margin: 0,
                                fontWeight: '500'
                            }}>
                                No scores submitted yet
                            </p>
                            <p style={{
                                fontSize: '14px',
                                color: '#999',
                                margin: '8px 0 0 0'
                            }}>
                                Submit scores from your assigned tasks
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* My Activity History Section */}
            {!loading && (
                <div style={{
                    marginTop: '40px'
                }}>
                    <h2 style={{
                        margin: '0 0 24px 0',
                        fontSize: '24px',
                        color: '#faf8f3',
                        fontWeight: '700'
                    }}>
                        📜 My Activity History
                    </h2>

                    {userHistory.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '20px'
                        }}>
                            {userHistory.map((item, idx) => (
                                <div key={idx} style={{
                                    backgroundColor: COLORS.light,
                                    padding: '16px',
                                    borderRadius: '12px',
                                    borderLeft: `6px solid ${COLORS.accent}`,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start',
                                        marginBottom: '12px'
                                    }}>
                                        <h4 style={{
                                            margin: 0,
                                            color: COLORS.dark,
                                            flex: 1
                                        }}>
                                            {item.action === 'SUBMIT_SCORE' && '📊 Submitted Score'}
                                            {item.action === 'UPDATE_SCORE' && '✏️ Updated Score'}
                                            {item.action === 'CREATE_TASK' && '📝 Created Task'}
                                            {item.action === 'UPDATE_TASK' && '✏️ Updated Task'}
                                        </h4>
                                    </div>

                                    <p style={{
                                        margin: '8px 0',
                                        color: COLORS.secondary,
                                        fontSize: '13px',
                                        fontWeight: '600'
                                    }}>
                                        📌 {item.description}
                                    </p>

                                    {item.details && (
                                        <div style={{
                                            backgroundColor: '#f5f5f5',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            marginTop: '12px'
                                        }}>
                                            {item.details.taskName && (
                                                <p style={{
                                                    margin: '4px 0',
                                                    fontSize: '13px',
                                                    color: '#666'
                                                }}>
                                                    <strong>📚 Task:</strong> {item.details.taskName}
                                                </p>
                                            )}
                                            {item.details.teamName && (
                                                <p style={{
                                                    margin: '4px 0',
                                                    fontSize: '13px',
                                                    color: '#666'
                                                }}>
                                                    <strong>👥 Team:</strong> {item.details.teamName}
                                                </p>
                                            )}
                                            {item.details.points !== undefined && (
                                                <p style={{
                                                    margin: '4px 0',
                                                    fontSize: '13px',
                                                    color: '#666'
                                                }}>
                                                    <strong>⭐ Points:</strong> {item.details.points}/{item.details.maxPoints}
                                                </p>
                                            )}
                                            {item.details.previousPoints !== undefined && item.details.previousPoints !== null && (
                                                <p style={{
                                                    margin: '4px 0',
                                                    fontSize: '13px',
                                                    color: '#666'
                                                }}>
                                                    <strong>🔄 Previous:</strong> {item.details.previousPoints}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <p style={{
                                        margin: '12px 0 0 0',
                                        fontSize: '12px',
                                        color: '#999',
                                        textAlign: 'right'
                                    }}>
                                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: COLORS.light,
                            padding: '40px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{
                                fontSize: '16px',
                                color: COLORS.dark,
                                margin: 0,
                                fontWeight: '500'
                            }}>
                                No activity history yet
                            </p>
                            <p style={{
                                fontSize: '14px',
                                color: '#999',
                                margin: '8px 0 0 0'
                            }}>
                                Your activity will appear here
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Change Password Section - Centered */}
            <div style={{
                marginTop: '60px',
                marginBottom: '60px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{ width: '100%', maxWidth: '500px' }}>
                    {!showChangePassword ? (
                        <button
                            onClick={() => {
                                setShowChangePassword(true);
                                setPasswordError('');
                                setPasswordSuccess('');
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 24px',
                                backgroundColor: COLORS.info,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#1976d2';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.backgroundColor = COLORS.info;
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                            }}
                        >
                            🔐 Change Password
                        </button>
                    ) : (
                        <div style={{
                            backgroundColor: COLORS.light,
                            padding: '30px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            border: `2px solid ${COLORS.info}`
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '24px'
                            }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '20px',
                                    color: COLORS.dark,
                                    fontWeight: '700'
                                }}>
                                    🔐 Change Your Password
                                </h3>
                                <button
                                    onClick={() => setShowChangePassword(false)}
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        color: '#999'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Password Error Message */}
                            {passwordError && (
                                <div style={{
                                    backgroundColor: '#ffebee',
                                    border: `2px solid ${COLORS.danger}`,
                                    color: COLORS.danger,
                                    padding: '15px',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    ⚠️ {passwordError}
                                </div>
                            )}

                            {/* Password Success Message */}
                            {passwordSuccess && (
                                <div style={{
                                    backgroundColor: '#e8f5e9',
                                    border: `2px solid ${COLORS.success}`,
                                    color: COLORS.success,
                                    padding: '15px',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    {passwordSuccess}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} style={{
                                display: 'grid',
                                gap: '16px'
                            }}>
                                {/* Current Password Field */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: COLORS.dark,
                                        fontWeight: '600',
                                        fontSize: '14px'
                                    }}>
                                        Current Password *
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter your current password"
                                        value={passwordForm.oldPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: `2px solid ${COLORS.secondary}`,
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.3s ease'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = COLORS.accent}
                                        onBlur={(e) => e.target.style.borderColor = COLORS.secondary}
                                        disabled={passwordLoading}
                                    />
                                </div>

                                {/* New Password Field */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: COLORS.dark,
                                        fontWeight: '600',
                                        fontSize: '14px'
                                    }}>
                                        New Password *
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter your new password (min 6 characters)"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: `2px solid ${COLORS.secondary}`,
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.3s ease'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = COLORS.accent}
                                        onBlur={(e) => e.target.style.borderColor = COLORS.secondary}
                                        disabled={passwordLoading}
                                    />
                                </div>

                                {/* Confirm Password Field */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        color: COLORS.dark,
                                        fontWeight: '600',
                                        fontSize: '14px'
                                    }}>
                                        Confirm New Password *
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Confirm your new password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: `2px solid ${COLORS.secondary}`,
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.3s ease'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = COLORS.accent}
                                        onBlur={(e) => e.target.style.borderColor = COLORS.secondary}
                                        disabled={passwordLoading}
                                    />
                                </div>

                                {/* Password Requirements Info */}
                                <div style={{
                                    backgroundColor: '#f5f5f5',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${COLORS.info}`,
                                    fontSize: '13px',
                                    color: '#666'
                                }}>
                                    <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Password Requirements:</p>
                                    <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px' }}>
                                        <li>Minimum 6 characters</li>
                                        <li>Different from your current password</li>
                                        <li>Must match in the confirmation field</li>
                                    </ul>
                                </div>

                                {/* Form Buttons */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    marginTop: '16px'
                                }}>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: passwordLoading ? '#ccc' : COLORS.success,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: passwordLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = '#45a049';
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = COLORS.success;
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                                            }
                                        }}
                                    >
                                        {passwordLoading ? '⏳ Updating...' : '💾 Change Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowChangePassword(false);
                                            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                            setPasswordError('');
                                        }}
                                        disabled={passwordLoading}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: '#ccc',
                                            color: COLORS.dark,
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: passwordLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = '#bbb';
                                                e.target.style.transform = 'translateY(-2px)';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = '#ccc';
                                                e.target.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    >
                                        ✕ Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Responsive Styles */}
            <style>{`
                @media (max-width: 768px) {
                    div {
                        font-size: 14px !important;
                    }
                }
                @media (max-width: 480px) {
                    h1 {
                        font-size: 24px !important;
                    }
                    h2 {
                        font-size: 18px !important;
                    }
                }
            `}</style>
        </div>
    );
}
