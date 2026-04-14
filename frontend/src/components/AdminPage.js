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

export default function AdminPage({ user, onLogout }) {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamLeaderboard, setTeamLeaderboard] = useState([]);
    const [scores, setScores] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [userHistory, setUserHistory] = useState([]);
    const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
    const [historySearchText, setHistorySearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showUserForm, setShowUserForm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editingTeam, setEditingTeam] = useState(null);

    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'ORGANIZER' });
    const [taskForm, setTaskForm] = useState({ name: '', maxPoints: 100, note: '', assignedOrganizers: [] });
    const [teamForm, setTeamForm] = useState({ name: '', members: [] });

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

    const apiCall = useCallback(async (endpoint, method = 'GET', body = null) => {
        try {
            const url = getApiUrl(endpoint);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };
            if (body) options.body = JSON.stringify(body);

            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 403) {
                    navigate('/login');
                    return null;
                }
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, [token, navigate]);

    const loadTabData = useCallback(async () => {
        setLoading(true);
        setError('');

        if (activeTab === 'users') {
            const data = await apiCall('/users');
            if (data) setUsers(data);
        } else if (activeTab === 'tasks') {
            const data = await apiCall('/tasks');
            if (data) setTasks(data);
        } else if (activeTab === 'teams') {
            const data = await apiCall('/teams');
            if (data) setTeams(data);
        } else if (activeTab === 'leaderboard') {
            const leaderboard = await apiCall('/leaderboard/teams');
            if (leaderboard) setTeamLeaderboard(leaderboard);
        } else if (activeTab === 'scores') {
            const data = await apiCall('/scores');
            if (data) setScores(data);
        } else if (activeTab === 'audit') {
            const data = await apiCall('/audit-logs');
            if (data) setAuditLogs(data.logs || []);
        } else if (activeTab === 'user-history') {
            const data = await apiCall('/user-history/all');
            if (data) setUserHistory(data.history || []);
        }

        setLoading(false);
    }, [activeTab, apiCall]);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        loadTabData();
    }, [token, navigate, loadTabData]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
        navigate('/login');
    };

    const createUser = async () => {
        if (!userForm.username || !userForm.password) {
            setError('Username and password required');
            return;
        }
        setError('');
        const result = await apiCall('/users', 'POST', userForm);
        if (result) {
            setUsers([...users, result]);
            setShowUserForm(false);
            setUserForm({ username: '', password: '', role: 'ORGANIZER' });
        }
    };

    const updateUser = async () => {
        if (!editingUser) return;
        const updateData = { role: userForm.role };
        if (userForm.username) updateData.username = userForm.username;

        setError('');
        const result = await apiCall(`/users/${editingUser._id}`, 'PUT', updateData);
        if (result) {
            setUsers(users.map(u => u._id === editingUser._id ? result : u));
            setEditingUser(null);
            setShowUserForm(false);
            setUserForm({ username: '', password: '', role: 'ORGANIZER' });
        }
    };

    const deleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setError('');
            const result = await apiCall(`/users/${userId}`, 'DELETE');
            if (result) {
                setUsers(users.filter(u => u._id !== userId));
            }
        }
    };

    const createTask = async () => {
        if (!taskForm.name) {
            setError('Task name required');
            return;
        }
        setError('');
        const result = await apiCall('/tasks', 'POST', taskForm);
        if (result) {
            setTasks([...tasks, result]);
            setShowTaskForm(false);
            setTaskForm({ name: '', maxPoints: 100, note: '', assignedOrganizers: [] });
        }
    };

    const updateTask = async () => {
        if (!editingTask) return;
        setError('');
        const result = await apiCall(`/tasks/${editingTask._id}`, 'PUT', taskForm);
        if (result) {
            setTasks(tasks.map(t => t._id === editingTask._id ? result : t));
            setEditingTask(null);
            setShowTaskForm(false);
            setTaskForm({ name: '', maxPoints: 100, note: '', assignedOrganizers: [] });
        }
    };

    const deleteTask = async (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            setError('');
            const result = await apiCall(`/tasks/${taskId}`, 'DELETE');
            if (result) {
                setTasks(tasks.filter(t => t._id !== taskId));
            }
        }
    };

    const startEditingUser = (userObj) => {
        setEditingUser(userObj);
        setUserForm({ username: userObj.username, password: '', role: userObj.role });
        setShowUserForm(true);
    };

    const startEditingTask = (taskObj) => {
        setEditingTask(taskObj);
        setTaskForm({ name: taskObj.name, maxPoints: taskObj.maxPoints, note: taskObj.note || '' });
        setShowTaskForm(true);
    };

    const renderUsers = () => (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setUserForm({ username: '', password: '', role: 'ORGANIZER' });
                        setShowUserForm(!showUserForm);
                    }}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: COLORS.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    ➕ Add New User
                </button>
            </div>

            {showUserForm && (
                <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: `2px solid ${COLORS.primary}`
                }}>
                    <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
                    <input
                        type="text"
                        placeholder="Username"
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                    {!editingUser && (
                        <input
                            type="password"
                            placeholder="Password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                    )}
                    <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    >
                        <option value="ADMIN">Admin</option>
                        <option value="ORGANIZER">Organizer</option>
                        <option value="VOLUNTEER">Volunteer</option>
                    </select>
                    <button
                        onClick={editingUser ? updateUser : createUser}
                        style={{ padding: '8px 16px', backgroundColor: COLORS.success, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        {editingUser ? 'Update User' : 'Create User'}
                    </button>
                    <button
                        onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                        }}
                        style={{ padding: '8px 16px', backgroundColor: COLORS.primary, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px' }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '15px'
            }}>
                {users.map(userObj => (
                    <div key={userObj._id} style={{
                        backgroundColor: '#fff',
                        padding: '15px',
                        borderRadius: '8px',
                        border: `2px solid ${COLORS.primary}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: COLORS.dark }}>{userObj.username}</h4>
                        <p style={{ margin: '5px 0', color: '#666' }}>Role: <strong>{userObj.role}</strong></p>
                        <p style={{ margin: '5px 0', color: '#666' }}>Created: {new Date(userObj.createdAt).toLocaleDateString()}</p>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => startEditingUser(userObj)}
                                style={{ flex: 1, padding: '8px', backgroundColor: COLORS.info, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => deleteUser(userObj._id)}
                                style={{ flex: 1, padding: '8px', backgroundColor: COLORS.danger, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTasks = () => (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => {
                        setEditingTask(null);
                        setTaskForm({ name: '', maxPoints: 100, note: '', assignedOrganizers: [] });
                        setShowTaskForm(!showTaskForm);
                    }}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: COLORS.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    ➕ Add New Task
                </button>
            </div>

            {showTaskForm && (
                <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: `2px solid ${COLORS.primary}`
                }}>
                    <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                    <input
                        type="text"
                        placeholder="Task Name"
                        value={taskForm.name}
                        onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                    <input
                        type="number"
                        placeholder="Max Points"
                        value={taskForm.maxPoints}
                        onChange={(e) => setTaskForm({ ...taskForm, maxPoints: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                    <textarea
                        placeholder="Note (optional)"
                        value={taskForm.note}
                        onChange={(e) => setTaskForm({ ...taskForm, note: e.target.value })}
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', minHeight: '60px', boxSizing: 'border-box' }}
                    />
                    {editingTask && (
                        <>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark }}>
                                Assign Organizers (optional):
                            </label>
                            <select
                                multiple
                                value={taskForm.assignedOrganizers}
                                onChange={(e) => setTaskForm({
                                    ...taskForm,
                                    assignedOrganizers: Array.from(e.target.selectedOptions, opt => opt.value)
                                })}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc',
                                    boxSizing: 'border-box',
                                    minHeight: '100px'
                                }}
                            >
                                {users.map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.username} ({user.role})
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: '#666', display: 'block', marginBottom: '10px' }}>
                                Hold Ctrl/Cmd to select multiple organizers
                            </small>
                        </>
                    )}
                    <button
                        onClick={editingTask ? updateTask : createTask}
                        style={{ padding: '8px 16px', backgroundColor: COLORS.success, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        {editingTask ? 'Update Task' : 'Create Task'}
                    </button>
                    <button
                        onClick={() => {
                            setShowTaskForm(false);
                            setEditingTask(null);
                        }}
                        style={{ padding: '8px 16px', backgroundColor: COLORS.primary, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px' }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '15px'
            }}>
                {tasks.map(taskObj => (
                    <div key={taskObj._id} style={{
                        backgroundColor: '#fff',
                        padding: '15px',
                        borderRadius: '8px',
                        border: `2px solid ${COLORS.accent}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: COLORS.dark }}>{taskObj.name}</h4>
                        <p style={{ margin: '5px 0', color: '#666' }}>Max Points: <strong>{taskObj.maxPoints}</strong></p>
                        {taskObj.note && <p style={{ margin: '5px 0', color: '#666', fontSize: '14px', fontStyle: 'italic' }}>Note: {taskObj.note}</p>}
                        {taskObj.assignedOrganizers && taskObj.assignedOrganizers.length > 0 && (
                            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                                👤 Assigned to: <strong>{taskObj.assignedOrganizers.map(org => org.username).join(', ')}</strong>
                            </p>
                        )}
                        <p style={{ margin: '5px 0', color: '#666' }}>Created: {new Date(taskObj.createdAt).toLocaleDateString()}</p>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => startEditingTask(taskObj)}
                                style={{ flex: 1, padding: '8px', backgroundColor: COLORS.info, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => deleteTask(taskObj._id)}
                                style={{ flex: 1, padding: '8px', backgroundColor: COLORS.danger, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '15px'
    }}>
        {tasks.map(taskObj => (
            <div key={taskObj._id} style={{
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '8px',
                border: `2px solid ${COLORS.accent}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: COLORS.dark }}>{taskObj.name}</h4>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>{taskObj.description || 'No description'}</p>
                <p style={{ margin: '5px 0', color: '#666' }}>Max Points: <strong>{taskObj.maxPoints}</strong></p>
                <p style={{ margin: '5px 0', color: '#666' }}>Created: {new Date(taskObj.createdAt).toLocaleDateString()}</p>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => startEditingTask(taskObj)}
                        style={{ flex: 1, padding: '8px', backgroundColor: COLORS.info, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => deleteTask(taskObj._id)}
                        style={{ flex: 1, padding: '8px', backgroundColor: COLORS.danger, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        ))}
    </div>

    const renderLeaderboard = () => (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <h2 style={{
                textAlign: 'center',
                fontSize: '32px',
                fontWeight: '800',
                margin: '0 0 40px 0',
                color: COLORS.dark
            }}>
                🏆 Team Leaderboard
            </h2>

            {teamLeaderboard.length > 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {teamLeaderboard.map((team, idx) => {
                        let medal = '   ';
                        if (idx === 0) medal = '🥇';
                        else if (idx === 1) medal = '🥈';
                        else if (idx === 2) medal = '🥉';

                        return (
                            <div key={team._id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                padding: '15px 20px',
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                border: `2px solid ${COLORS.accent}`,
                                transition: 'all 0.3s ease'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateX(5px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                }}
                            >
                                <div style={{
                                    fontSize: '24px',
                                    minWidth: '40px',
                                    textAlign: 'center'
                                }}>
                                    {medal}
                                </div>
                                <div style={{
                                    flex: 1
                                }}>
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: COLORS.dark
                                    }}>
                                        #{idx + 1} {team.name}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: '900',
                                    color: COLORS.success,
                                    minWidth: '80px',
                                    textAlign: 'right'
                                }}>
                                    ⭐ {team.totalScore}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    color: '#666'
                }}>
                    No teams yet
                </div>
            )}
        </div>
    );

    const renderScores = () => (
        <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
            {scores.length > 0 ? (
                <div style={{
                    overflowX: 'auto'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                    }}>
                        <thead>
                            <tr style={{
                                backgroundColor: COLORS.primary,
                                color: 'white'
                            }}>
                                <th style={{
                                    padding: '15px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    borderRight: '1px solid #e0e0e0'
                                }}>Organizer</th>
                                <th style={{
                                    padding: '15px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    borderRight: '1px solid #e0e0e0'
                                }}>Task</th>
                                <th style={{
                                    padding: '15px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    borderRight: '1px solid #e0e0e0'
                                }}>Team</th>
                                <th style={{
                                    padding: '15px',
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    borderRight: '1px solid #e0e0e0'
                                }}>Points</th>
                                <th style={{
                                    padding: '15px',
                                    textAlign: 'left',
                                    fontWeight: '600'
                                }}>Date Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scores.map((score, idx) => (
                                <tr key={score._id} style={{
                                    borderBottom: '1px solid #e0e0e0',
                                    backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white'
                                }}>
                                    <td style={{
                                        padding: '15px',
                                        borderRight: '1px solid #e0e0e0',
                                        fontWeight: '500',
                                        color: COLORS.dark
                                    }}>
                                        {score.organizerId?.username || 'Unknown'}
                                    </td>
                                    <td style={{
                                        padding: '15px',
                                        borderRight: '1px solid #e0e0e0',
                                        color: COLORS.dark
                                    }}>
                                        {score.taskId?.name || 'Unknown'}
                                    </td>
                                    <td style={{
                                        padding: '15px',
                                        borderRight: '1px solid #e0e0e0',
                                        fontWeight: '500',
                                        color: COLORS.dark
                                    }}>
                                        {score.teamId?.name || 'Unknown'}
                                    </td>
                                    <td style={{
                                        padding: '15px',
                                        borderRight: '1px solid #e0e0e0',
                                        textAlign: 'center',
                                        fontWeight: '700',
                                        color: COLORS.success,
                                        fontSize: '16px'
                                    }}>
                                        +{score.points}
                                    </td>
                                    <td style={{
                                        padding: '15px',
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
                    padding: '40px',
                    textAlign: 'center',
                    color: '#666'
                }}>
                    No scores submitted yet
                </div>
            )}
        </div>
    );

    const renderTeams = () => {
        const handleCreateTeam = async () => {
            if (!teamForm.name.trim()) {
                setError('Team name is required');
                return;
            }

            let result;
            if (editingTeam) {
                result = await apiCall(`/teams/${editingTeam._id}`, 'PUT', { name: teamForm.name, members: teamForm.members });
                if (result) {
                    setTeams(teams.map(t => t._id === editingTeam._id ? result : t));
                    setError('');
                    setSuccess('Team updated successfully! ✓');
                }
            } else {
                result = await apiCall('/teams', 'POST', { name: teamForm.name, members: teamForm.members });
                if (result) {
                    setTeams([...teams, result]);
                    setError('');
                    setSuccess('Team created successfully! ✓');
                }
            }
            setEditingTeam(null);
            setShowTeamForm(false);
            setTeamForm({ name: '', members: [] });
            setTimeout(() => setSuccess(''), 3000);
        };

        const handleDeleteTeam = async (teamId) => {
            if (window.confirm('Are you sure you want to delete this team?')) {
                const result = await apiCall(`/teams/${teamId}`, 'DELETE');
                if (result) {
                    setTeams(teams.filter(t => t._id !== teamId));
                    setError('');
                    setSuccess('Team deleted successfully! ✓');
                    setTimeout(() => setSuccess(''), 3000);
                }
            }
        };

        return (
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ margin: 0, color: COLORS.dark }}>Manage Teams ({teams.length})</h3>
                    <button
                        onClick={() => {
                            setEditingTeam(null);
                            setTeamForm({ name: '', members: [] });
                            setShowTeamForm(!showTeamForm);
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: COLORS.success,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}
                    >
                        {showTeamForm ? '✕ Cancel' : '➕ Create Team'}
                    </button>
                </div>

                {showTeamForm && (
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        border: `2px solid ${COLORS.accent}`,
                        marginBottom: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <h4 style={{ margin: '0 0 15px 0', color: COLORS.dark }}>
                            {editingTeam ? 'Edit Team' : 'Create New Team'}
                        </h4>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: COLORS.dark
                            }}>
                                Team Name
                            </label>
                            <input
                                type="text"
                                value={teamForm.name}
                                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                placeholder="Enter team name"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: `2px solid ${COLORS.accent}`,
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box',
                                    fontWeight: '500'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: COLORS.dark
                            }}>
                                👥 Team Members <span style={{ fontWeight: '400', color: '#999' }}>(Optional)</span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    id="memberInput"
                                    placeholder="Enter member name"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            const memberName = e.target.value.trim();
                                            if (memberName && !teamForm.members.includes(memberName)) {
                                                setTeamForm({
                                                    ...teamForm,
                                                    members: [...teamForm.members, memberName]
                                                });
                                                e.target.value = '';
                                            } else if (teamForm.members.includes(memberName)) {
                                                setError('Member already added');
                                                setTimeout(() => setError(''), 2000);
                                            }
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: `2px solid ${COLORS.accent}`,
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.getElementById('memberInput');
                                        const memberName = input.value.trim();
                                        if (memberName && !teamForm.members.includes(memberName)) {
                                            setTeamForm({
                                                ...teamForm,
                                                members: [...teamForm.members, memberName]
                                            });
                                            input.value = '';
                                            setError('');
                                        } else if (!memberName) {
                                            setError('Please enter a member name');
                                            setTimeout(() => setError(''), 2000);
                                        } else if (teamForm.members.includes(memberName)) {
                                            setError('Member already added');
                                            setTimeout(() => setError(''), 2000);
                                        }
                                    }}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: COLORS.info,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    ➕ Add
                                </button>
                            </div>

                            {teamForm.members.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    padding: '10px',
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '6px',
                                    borderLeft: `4px solid ${COLORS.success}`
                                }}>
                                    {teamForm.members.map((member, idx) => (
                                        <div key={idx} style={{
                                            backgroundColor: COLORS.success,
                                            color: 'white',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}>
                                            {member}
                                            <button
                                                onClick={() => {
                                                    setTeamForm({
                                                        ...teamForm,
                                                        members: teamForm.members.filter((_, i) => i !== idx)
                                                    });
                                                }}
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.3)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '20px',
                                                    height: '20px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    padding: 0
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleCreateTeam}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: COLORS.success,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                {editingTeam ? '✓ Update' : '✓ Create'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowTeamForm(false);
                                    setEditingTeam(null);
                                    setTeamForm({ name: '', members: [] });
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#999',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: `2px solid ${COLORS.primary}`,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    {teams.length > 0 ? (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '14px'
                        }}>
                            <thead>
                                <tr style={{
                                    backgroundColor: COLORS.primary,
                                    color: 'white'
                                }}>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        borderRight: '1px solid rgba(255,255,255,0.2)'
                                    }}>Team Name</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'center',
                                        fontWeight: '600',
                                        borderRight: '1px solid rgba(255,255,255,0.2)'
                                    }}>Score</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        borderRight: '1px solid rgba(255,255,255,0.2)'
                                    }}>Members</th>
                                    <th style={{
                                        padding: '15px',
                                        textAlign: 'center',
                                        fontWeight: '600'
                                    }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((team, idx) => (
                                    <tr key={team._id} style={{
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: idx % 2 === 0 ? '#fafafa' : '#fff'
                                    }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fafafa' : '#fff'}
                                    >
                                        <td style={{
                                            padding: '15px',
                                            fontWeight: '600',
                                            color: COLORS.dark
                                        }}>
                                            {team.name}
                                        </td>
                                        <td style={{
                                            padding: '15px',
                                            textAlign: 'center',
                                            fontWeight: '700',
                                            color: COLORS.success,
                                            fontSize: '16px'
                                        }}>
                                            ⭐ {team.totalScore}
                                        </td>
                                        <td style={{
                                            padding: '15px',
                                            color: '#666',
                                            fontSize: '13px'
                                        }}>
                                            {team.members && team.members.length > 0 ? team.members.join(', ') : 'No members'}
                                        </td>
                                        <td style={{
                                            padding: '15px',
                                            textAlign: 'center'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    setEditingTeam(team);
                                                    setTeamForm({ name: team.name, members: team.members || [] });
                                                    setShowTeamForm(true);
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: COLORS.warning,
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    marginRight: '8px'
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTeam(team._id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: COLORS.danger,
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: '#666',
                            fontSize: '14px'
                        }}>
                            No teams created yet. Create your first team!
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderUserHistory = () => {
        // Get unique usernames from history
        const uniqueUsers = Array.from(new Set(userHistory.map(h => h.username)));

        // Filter history based on selected user and search text
        const filteredHistory = userHistory.filter(item => {
            const matchesUser = !selectedUserForHistory || item.username === selectedUserForHistory;
            const matchesSearch = !historySearchText ||
                item.description.toLowerCase().includes(historySearchText.toLowerCase()) ||
                item.action.toLowerCase().includes(historySearchText.toLowerCase()) ||
                (item.details?.taskName?.toLowerCase().includes(historySearchText.toLowerCase())) ||
                (item.details?.teamName?.toLowerCase().includes(historySearchText.toLowerCase()));
            return matchesUser && matchesSearch;
        });

        return (
            <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
                {/* Left Sidebar - User List */}
                <div style={{
                    width: '250px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: `2px solid ${COLORS.primary}`,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        backgroundColor: COLORS.primary,
                        color: 'white',
                        padding: '15px',
                        fontWeight: '600'
                    }}>
                        👥 Users
                    </div>
                    <div style={{ padding: '10px', borderBottom: `1px solid #eee` }}>
                        <button
                            onClick={() => {
                                setSelectedUserForHistory(null);
                                setHistorySearchText('');
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: !selectedUserForHistory ? COLORS.accent : '#f5f5f5',
                                color: !selectedUserForHistory ? 'white' : COLORS.dark,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                if (selectedUserForHistory) e.target.style.backgroundColor = '#e8e8e8';
                            }}
                            onMouseOut={(e) => {
                                if (selectedUserForHistory) e.target.style.backgroundColor = '#f5f5f5';
                            }}
                        >
                            📋 All Users
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {uniqueUsers.map(username => (
                            <button
                                key={username}
                                onClick={() => setSelectedUserForHistory(username)}
                                style={{
                                    width: '100%',
                                    padding: '12px 15px',
                                    textAlign: 'left',
                                    backgroundColor: selectedUserForHistory === username ? COLORS.accent : 'transparent',
                                    color: selectedUserForHistory === username ? 'white' : COLORS.dark,
                                    border: 'none',
                                    borderBottom: '1px solid #eee',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: selectedUserForHistory === username ? '600' : '500',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (selectedUserForHistory !== username) {
                                        e.target.style.backgroundColor = '#f0f0f0';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (selectedUserForHistory !== username) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{username}</span>
                                    <span style={{
                                        backgroundColor: selectedUserForHistory === username ? 'rgba(255,255,255,0.3)' : '#e0e0e0',
                                        color: selectedUserForHistory === username ? 'white' : '#666',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        fontSize: '11px',
                                        fontWeight: '600'
                                    }}>
                                        {userHistory.filter(h => h.username === username).length}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Main Area - History */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Search Bar */}
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: `2px solid ${COLORS.primary}`,
                        padding: '15px',
                        marginBottom: '15px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <input
                            type="text"
                            placeholder="🔍 Search by action, task, team, or description..."
                            value={historySearchText}
                            onChange={(e) => setHistorySearchText(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: `2px solid ${COLORS.accent}`,
                                borderRadius: '6px',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                fontWeight: '500'
                            }}
                        />
                        <p style={{
                            margin: '8px 0 0 0',
                            fontSize: '12px',
                            color: '#999'
                        }}>
                            {selectedUserForHistory ? `${filteredHistory.length} activities for ${selectedUserForHistory}` : `${filteredHistory.length} total activities`}
                        </p>
                    </div>

                    {/* History Cards */}
                    <div style={{
                        flex: 1,
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: `2px solid ${COLORS.primary}`,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            backgroundColor: COLORS.primary,
                            color: 'white',
                            padding: '15px',
                            fontWeight: '600'
                        }}>
                            {selectedUserForHistory ? `📜 ${selectedUserForHistory}'s Activity History` : '📜 All User Activities'}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', alignContent: 'flex-start' }}>
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map((item, idx) => (
                                    <div key={idx} style={{
                                        backgroundColor: '#f9f9f9',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        borderLeft: `5px solid ${COLORS.accent}`,
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                        transition: 'all 0.3s ease'
                                    }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'translateX(4px)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'translateX(0)';
                                            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start',
                                            marginBottom: '10px'
                                        }}>
                                            <h4 style={{
                                                margin: 0,
                                                color: COLORS.dark,
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                flex: 1,
                                                marginRight: '10px'
                                            }}>
                                                {item.action === 'SUBMIT_SCORE' && '📊 Score Submitted'}
                                                {item.action === 'UPDATE_SCORE' && '✏️ Score Updated'}
                                                {item.action === 'CREATE_TASK' && '📝 Task Created'}
                                                {item.action === 'UPDATE_TASK' && '✏️ Task Updated'}
                                            </h4>
                                            <span style={{
                                                backgroundColor: COLORS.primary,
                                                color: 'white',
                                                padding: '3px 8px',
                                                borderRadius: '3px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {item.username}
                                            </span>
                                        </div>

                                        <p style={{
                                            margin: '8px 0',
                                            color: '#555',
                                            fontSize: '13px',
                                            lineHeight: '1.4'
                                        }}>
                                            {item.description}
                                        </p>

                                        {item.details && (
                                            <div style={{
                                                backgroundColor: '#f0f0f0',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                marginTop: '10px',
                                                fontSize: '12px',
                                                color: '#555'
                                            }}>
                                                {item.details.taskName && (
                                                    <p style={{ margin: '4px 0' }}>
                                                        <strong>📚 Task:</strong> {item.details.taskName}
                                                    </p>
                                                )}
                                                {item.details.teamName && (
                                                    <p style={{ margin: '4px 0' }}>
                                                        <strong>👥 Team:</strong> {item.details.teamName}
                                                    </p>
                                                )}
                                                {item.details.points !== undefined && (
                                                    <p style={{ margin: '4px 0' }}>
                                                        <strong>⭐ Points:</strong> {item.details.points}/{item.details.maxPoints}
                                                    </p>
                                                )}
                                                {item.details.previousPoints !== undefined && item.details.previousPoints !== null && (
                                                    <p style={{ margin: '4px 0' }}>
                                                        <strong>🔄 Previous:</strong> {item.details.previousPoints}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <p style={{
                                            margin: '10px 0 0 0',
                                            fontSize: '11px',
                                            color: '#999'
                                        }}>
                                            {new Date(item.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div style={{
                                    gridColumn: '1 / -1',
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    color: '#999',
                                    fontSize: '14px'
                                }}>
                                    {selectedUserForHistory ? `No activities found for ${selectedUserForHistory}` : 'No activities found'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderAuditLog = () => (
        <div>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: `2px solid ${COLORS.primary}`,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    backgroundColor: COLORS.primary,
                    color: 'white',
                    padding: '15px',
                    fontWeight: '600'
                }}>
                    Activity Log (All Entries)
                </div>
                <div style={{ maxHeight: '700px', overflowY: 'auto', padding: '0' }}>
                    {auditLogs.length > 0 ? (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px'
                        }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: `1px solid ${COLORS.primary}` }}>
                                    <th style={{ padding: '10px', textAlign: 'left', minWidth: '150px' }}>Time</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
                                    <th style={{ padding: '10px', textAlign: 'left', minWidth: '80px' }}>Type</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Entity</th>
                                    <th style={{ padding: '10px', textAlign: 'left', minWidth: '150px' }}>Details</th>
                                    <th style={{ padding: '10px', textAlign: 'left', minWidth: '100px' }}>By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log, idx) => (
                                    <tr key={log._id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fafafa' : '#fff' }}>
                                        <td style={{ padding: '10px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                backgroundColor: log.action === 'DELETE' ? COLORS.danger : log.action === 'CREATE' ? COLORS.success : COLORS.warning,
                                                color: 'white',
                                                borderRadius: '3px',
                                                fontSize: '11px',
                                                fontWeight: '600'
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px', fontWeight: '500' }}>{log.entityType}</td>
                                        <td style={{ padding: '10px', fontWeight: '600', color: COLORS.primary }}>
                                            {log.entityType === 'SCORE' ? (
                                                `📊 Score Entry`
                                            ) : log.entityType === 'TASK' ? (
                                                `✅ ${log.entityName || 'Task'}`
                                            ) : log.entityType === 'USER' ? (
                                                `👤 ${log.entityName || 'User'}`
                                            ) : (
                                                log.entityName || log.entityId
                                            )}
                                        </td>
                                        <td style={{ padding: '10px', color: '#555', maxWidth: '250px', wordBreak: 'break-word' }}>
                                            {log.description || (log.newValues && (
                                                <span>
                                                    {log.entityType === 'SCORE' && log.newValues.points && (
                                                        <span>➕ {log.newValues.points} points awarded</span>
                                                    )}
                                                    {log.entityType === 'USER' && log.newValues.role && (
                                                        <span>🔐 Role: {log.newValues.role}</span>
                                                    )}
                                                    {log.entityType === 'TASK' && log.newValues.maxPoints && (
                                                        <span>⭐ Max Points: {log.newValues.maxPoints}</span>
                                                    )}
                                                </span>
                                            )) || '-'}
                                        </td>
                                        <td style={{ padding: '10px' }}>{log.adminUsername || 'System'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                            No audit logs yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: '#f5f5f5'
        }}>
            <div style={{
                width: '250px',
                backgroundColor: COLORS.dark,
                color: 'white',
                padding: '20px',
                boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
                overflowY: 'auto'
            }}>
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>Game Pointer</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: '#bbb' }}>Admin Panel</p>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#bbb', fontWeight: '600' }}>Logged in as</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>{user?.username}</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#bbb' }}>Role: {user?.role}</p>
                </div>

                <nav style={{ marginBottom: '30px' }}>
                    {[
                        { id: 'users', label: '👥 Users' },
                        { id: 'tasks', label: '✅ Tasks' },
                        { id: 'teams', label: '👥 Teams' },
                        { id: 'leaderboard', label: '🏆 Leaderboard' },
                        { id: 'scores', label: '📊 Scores' },
                        { id: 'audit', label: '📋 Audit Log' },
                        { id: 'user-history', label: '📜 User History' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                width: '100%',
                                padding: '12px 15px',
                                marginBottom: '8px',
                                backgroundColor: activeTab === tab.id ? COLORS.primary : 'transparent',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: activeTab === tab.id ? '600' : '500',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.id) e.target.style.backgroundColor = 'rgba(135, 118, 67, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.id) e.target.style.backgroundColor = 'transparent';
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '12px 15px',
                        backgroundColor: COLORS.danger,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    🚪 Logout
                </button>
            </div>

            <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ margin: '0 0 10px 0', color: COLORS.dark }}>
                        {activeTab === 'users' && '👥 User Management'}
                        {activeTab === 'tasks' && '✅ Task Management'}
                        {activeTab === 'teams' && '👥 Team Management'}
                        {activeTab === 'leaderboard' && '🏆 Leaderboard'}
                        {activeTab === 'scores' && '📊 Submitted Scores'}
                        {activeTab === 'audit' && '📋 Activity Log'}
                        {activeTab === 'user-history' && '📜 User History'}
                    </h1>
                    <p style={{ margin: 0, color: '#666' }}>
                        {activeTab === 'users' && 'Create, edit, and manage user accounts'}
                        {activeTab === 'tasks' && 'Create and manage tasks with custom point values'}
                        {activeTab === 'teams' && 'Create, edit, and manage competing teams'}
                        {activeTab === 'leaderboard' && 'View real-time team and individual leaderboards'}
                        {activeTab === 'scores' && 'View all scores submitted by organizers with details'}
                        {activeTab === 'audit' && 'Audit trail of all admin actions and changes'}
                        {activeTab === 'user-history' && 'Track all activities performed by users including score submissions and task creation'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: `1px solid ${COLORS.danger}`
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        backgroundColor: '#e8f5e9',
                        color: '#2e7d32',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: `1px solid ${COLORS.success}`
                    }}>
                        {success}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: '#666' }}>Loading...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'tasks' && renderTasks()}
                        {activeTab === 'teams' && renderTeams()}
                        {activeTab === 'leaderboard' && renderLeaderboard()}
                        {activeTab === 'scores' && renderScores()}
                        {activeTab === 'audit' && renderAuditLog()}
                        {activeTab === 'user-history' && renderUserHistory()}
                    </>
                )}
            </div>
        </div>
    );
}
