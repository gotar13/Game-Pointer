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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
    const [teamsListOpen, setTeamsListOpen] = useState(true);
    const [showUserForm, setShowUserForm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editingTeam, setEditingTeam] = useState(null);
    const [editingScore, setEditingScore] = useState(null);
    const [scoreFilterTeam, setScoreFilterTeam] = useState('');
    const [scoreFilterTask, setScoreFilterTask] = useState('');
    const [collapsedDays, setCollapsedDays] = useState({ 'Day 1': false, 'Day 2': false, 'Day 3': false });
    const [collapsedCategories, setCollapsedCategories] = useState({});
    const [pointingTask, setPointingTask] = useState(null);
    const [pointForm, setPointForm] = useState({ teamId: '', points: '', comment: '' });
    const [scoreForm, setScoreForm] = useState({ teamId: '', taskId: '', points: '', comment: '' });
    const [showNewScoreForm, setShowNewScoreForm] = useState(false);
    const [deletedScores, setDeletedScores] = useState([]);
    const [showDeletedScores, setShowDeletedScores] = useState(false);

    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'ORGANIZER' });
    const [taskForm, setTaskForm] = useState({ name: '', category: '', day: 'Day 1', maxPoints: 100, note: '', isAllDay: false, startTime: '', endTime: '', assignedOrganizers: [] });
    const [teamForm, setTeamForm] = useState({ name: '', members: [] });

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const getApiUrl = (endpoint) => {
        // Use relative URL for AWS/production compatibility
        // Falls back to environment variable if set (e.g., for cross-origin requests)
        const baseUrl = '/api';

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
            const tasksData = await apiCall('/tasks');
            if (tasksData) setTasks(tasksData);
            const teamsData = await apiCall('/teams');
            if (teamsData) setTeams(teamsData);
        } else if (activeTab === 'teams') {
            const data = await apiCall('/teams');
            if (data) setTeams(data);
        } else if (activeTab === 'leaderboard') {
            const leaderboard = await apiCall('/leaderboard/teams');
            if (leaderboard) setTeamLeaderboard(leaderboard);
        } else if (activeTab === 'scores') {
            const data = await apiCall('/scores');
            if (data) setScores(data.scores || []);
            const deletedData = await apiCall('/scores/deleted');
            if (deletedData) setDeletedScores(deletedData.scores || []);
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
            setTaskForm({ name: '', category: '', day: 'Day 1', maxPoints: 100, note: '', isAllDay: false, startTime: '', endTime: '', assignedOrganizers: [] });
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
            setTaskForm({ name: '', category: '', day: 'Day 1', maxPoints: 100, note: '', isAllDay: false, startTime: '', endTime: '', assignedOrganizers: [] });
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

    const submitPoint = async () => {
        if (!pointForm.teamId || pointForm.points === '') {
            setError('Team and points are required');
            return;
        }

        const points = parseInt(pointForm.points);
        if (isNaN(points) || points < 0) {
            setError('Points must be a valid number (0 or greater)');
            return;
        }

        if (points > pointingTask.maxPoints) {
            setError(`Points cannot exceed max points of ${pointingTask.maxPoints}`);
            return;
        }

        setError('');
        const result = await apiCall('/scores', 'POST', {
            taskId: pointingTask._id,
            teamId: pointForm.teamId,
            organizerId: user.id,
            points: points,
            comment: pointForm.comment || ''
        });

        if (result) {
            // Log to user history
            const team = teams.find(t => t._id === pointForm.teamId);
            await apiCall('/user-history', 'POST', {
                action: 'SUBMIT_SCORE',
                description: `Assigned ${points} points to task: ${pointingTask.name}`,
                details: {
                    taskName: pointingTask.name,
                    teamName: team?.name,
                    points: points,
                    maxPoints: pointingTask.maxPoints,
                    comment: pointForm.comment
                }
            });

            setSuccess('Points assigned successfully! ✓');
            setTimeout(() => setSuccess(''), 3000);
            setPointingTask(null);
            setPointForm({ teamId: '', points: '', comment: '' });
            loadTabData(); // Reload scores/data
        }
    };

    const handleDeleteScore = async (scoreId) => {
        const score = scores.find(s => s._id === scoreId);
        const result = await apiCall(`/scores/${scoreId}`, 'DELETE');
        if (result) {
            // Log to user history
            await apiCall('/user-history', 'POST', {
                action: 'DELETE_SCORE',
                description: `Deleted score entry from ${score?.taskId?.name || 'unknown task'}`,
                details: {
                    taskName: score?.taskId?.name,
                    teamName: score?.teamId?.name,
                    points: score?.points
                }
            });

            setSuccess('Score deleted successfully! ✓');
            setTimeout(() => setSuccess(''), 3000);
            loadTabData();
        }
    };

    const handleUpdateScore = async () => {
        if (!scoreForm.teamId || !scoreForm.taskId || scoreForm.points === '') {
            setError('All fields are required');
            return;
        }

        const points = parseInt(scoreForm.points);
        if (isNaN(points) || points < 0) {
            setError('Points must be a valid number (0 or greater)');
            return;
        }

        const task = tasks.find(t => t._id === scoreForm.taskId);
        if (points > task?.maxPoints) {
            setError(`Points cannot exceed max points of ${task.maxPoints}`);
            return;
        }

        setError('');
        const result = await apiCall(`/scores/${editingScore._id}`, 'PUT', {
            points: points,
            comment: scoreForm.comment || ''
        });

        if (result) {
            // Log to user history
            const team = teams.find(t => t._id === scoreForm.teamId);
            await apiCall('/user-history', 'POST', {
                action: 'UPDATE_SCORE',
                description: `Updated score from ${editingScore?.points} to ${points} points for task: ${task?.name}`,
                details: {
                    taskName: task?.name,
                    teamName: team?.name,
                    points: points,
                    previousPoints: editingScore?.points,
                    maxPoints: task?.maxPoints
                }
            });

            setSuccess('Score updated successfully! ✓');
            setTimeout(() => setSuccess(''), 3000);
            setEditingScore(null);
            setScoreForm({ teamId: '', taskId: '', points: '', comment: '' });
            loadTabData();
        }
    };

    const handleRestoreScore = async (scoreId) => {
        const result = await apiCall(`/scores/${scoreId}/restore`, 'PUT', {});
        if (result) {
            setSuccess('Score restored successfully! ✓');
            setTimeout(() => setSuccess(''), 3000);
            loadTabData();
        }
    };

    const handleCreateScore = async () => {
        if (!scoreForm.teamId || !scoreForm.taskId || scoreForm.points === '') {
            setError('Task, team, and points are required');
            return;
        }

        const points = parseInt(scoreForm.points);
        if (isNaN(points) || points < 0) {
            setError('Points must be a valid number (0 or greater)');
            return;
        }

        const task = tasks.find(t => t._id === scoreForm.taskId);
        if (points > task?.maxPoints) {
            setError(`Points cannot exceed max points of ${task.maxPoints}`);
            return;
        }

        setError('');
        const result = await apiCall('/scores', 'POST', {
            taskId: scoreForm.taskId,
            teamId: scoreForm.teamId,
            organizerId: user.id,
            points: points,
            comment: scoreForm.comment || ''
        });

        if (result) {
            // Log to user history
            const team = teams.find(t => t._id === scoreForm.teamId);
            await apiCall('/user-history', 'POST', {
                action: 'SUBMIT_SCORE',
                description: `Created score of ${points} points for task: ${task?.name}`,
                details: {
                    taskName: task?.name,
                    teamName: team?.name,
                    points: points,
                    maxPoints: task?.maxPoints
                }
            });

            setSuccess('Score created successfully! ✓');
            setTimeout(() => setSuccess(''), 3000);
            setShowNewScoreForm(false);
            setScoreForm({ teamId: '', taskId: '', points: '', comment: '' });
            loadTabData();
        }
    };

    const startEditingUser = (userObj) => {
        setEditingUser(userObj);
        setUserForm({ username: userObj.username, password: '', role: userObj.role });
        setShowUserForm(true);
    };

    const startEditingTask = (taskObj) => {
        setEditingTask(taskObj);
        setTaskForm({
            name: taskObj.name,
            category: taskObj.category || '',
            day: taskObj.day || 'Day 1',
            maxPoints: taskObj.maxPoints,
            note: taskObj.note || '',
            isAllDay: taskObj.isAllDay || false,
            startTime: taskObj.startTime || '',
            endTime: taskObj.endTime || '',
            assignedOrganizers: taskObj.assignedOrganizers || []
        });
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
                {[...users].sort((a, b) => a.username.localeCompare(b.username)).map(userObj => (
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

    const renderTasks = () => {
        // Group tasks by day and category
        const tasksByDayAndCategory = {
            'Day 1': {},
            'Day 2': {},
            'Day 3': {}
        };

        // Sort tasks by newest first (descending order by createdAt)
        const sortedTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Group by day, then by category
        sortedTasks.forEach(task => {
            const day = task.day || 'Day 1';
            const category = task.category || 'Uncategorized';

            if (tasksByDayAndCategory[day]) {
                if (!tasksByDayAndCategory[day][category]) {
                    tasksByDayAndCategory[day][category] = [];
                }
                tasksByDayAndCategory[day][category].push(task);
            }
        });

        return (
            <div>
                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={() => {
                            setEditingTask(null);
                            setTaskForm({ name: '', category: '', day: 'Day 1', maxPoints: 100, note: '', isAllDay: false, startTime: '', endTime: '', assignedOrganizers: [] });
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
                            placeholder="Task Name *"
                            value={taskForm.name}
                            onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                        <input
                            type="text"
                            placeholder="Category"
                            value={taskForm.category}
                            onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                        <select
                            value={taskForm.day}
                            onChange={(e) => setTaskForm({ ...taskForm, day: e.target.value })}
                            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        >
                            <option value="Day 1">Day 1</option>
                            <option value="Day 2">Day 2</option>
                            <option value="Day 3">Day 3</option>
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
                            <label style={{ fontWeight: '600', color: COLORS.dark }}>
                                <input
                                    type="checkbox"
                                    checked={taskForm.isAllDay}
                                    onChange={(e) => setTaskForm({ ...taskForm, isAllDay: e.target.checked })}
                                    style={{ marginRight: '8px', cursor: 'pointer' }}
                                />
                                All Day Task
                            </label>
                        </div>
                        {!taskForm.isAllDay && (
                            <>
                                <label style={{ fontSize: '12px', color: COLORS.dark, fontWeight: '500', marginBottom: '4px', display: 'block' }}>Start Time (24h)</label>
                                <input
                                    type="time"
                                    placeholder="Start Time"
                                    value={taskForm.startTime}
                                    onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })}
                                    lang="en-GB"
                                    style={{ width: '48%', padding: '10px', marginRight: '4%', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                                />
                                <label style={{ fontSize: '12px', color: COLORS.dark, fontWeight: '500', marginBottom: '4px', display: 'block' }}>End Time (24h)</label>
                                <input
                                    type="time"
                                    placeholder="End Time"
                                    value={taskForm.endTime}
                                    onChange={(e) => setTaskForm({ ...taskForm, endTime: e.target.value })}
                                    lang="en-GB"
                                    style={{ width: '48%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                                />
                            </>
                        )}
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
                                    👥 Assign Organizers (optional):
                                </label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                    <select
                                        id="organizerSelect"
                                        defaultValue=""
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            border: `2px solid ${COLORS.accent}`,
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            backgroundColor: 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="">-- Select organizer --</option>
                                        {[...users].sort((a, b) => a.username.localeCompare(b.username)).map(userObj => (
                                            <option key={userObj._id} value={userObj._id}>
                                                {userObj.username} ({userObj.role})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            const select = document.getElementById('organizerSelect');
                                            const userId = select?.value;
                                            const user = users.find(u => u._id === userId);

                                            if (!userId) {
                                                setError('Please select an organizer');
                                                setTimeout(() => setError(''), 2000);
                                                return;
                                            }

                                            if (taskForm.assignedOrganizers.some(org => org._id === userId)) {
                                                setError('Organizer already assigned');
                                                setTimeout(() => setError(''), 2000);
                                                return;
                                            }

                                            setTaskForm({
                                                ...taskForm,
                                                assignedOrganizers: [...taskForm.assignedOrganizers, user]
                                            });
                                            select.value = '';
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

                                {taskForm.assignedOrganizers.length > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                        padding: '10px',
                                        backgroundColor: '#f0f0f0',
                                        borderRadius: '6px',
                                        borderLeft: `4px solid ${COLORS.info}`,
                                        marginBottom: '10px'
                                    }}>
                                        {taskForm.assignedOrganizers.map((org, idx) => (
                                            <div key={idx} style={{
                                                backgroundColor: COLORS.info,
                                                color: 'white',
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '13px',
                                                fontWeight: '600'
                                            }}>
                                                👤 {org.username} ({org.role})
                                                <button
                                                    onClick={() => {
                                                        setTaskForm({
                                                            ...taskForm,
                                                            assignedOrganizers: taskForm.assignedOrganizers.filter((_, i) => i !== idx)
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
                                setTaskForm({ name: '', category: '', day: 'Day 1', maxPoints: 100, note: '', isAllDay: false, startTime: '', endTime: '', assignedOrganizers: [] });
                            }}
                            style={{ padding: '8px 16px', backgroundColor: COLORS.primary, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px' }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {pointingTask && (
                    <div style={{
                        backgroundColor: '#f5f5f5',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: `2px solid ${COLORS.success}`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: COLORS.dark }}>⭐ Assign Points to: <strong>{pointingTask.name}</strong></h3>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '15px',
                            borderLeft: `4px solid ${COLORS.accent}`
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                                <div>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Max Points</p>
                                    <p style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: COLORS.success }}>⭐ {pointingTask.maxPoints}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Day</p>
                                    <p style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: COLORS.primary }}>📅 {pointingTask.day}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Category</p>
                                    <p style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: COLORS.dark }}>📂 {pointingTask.category || 'N/A'}</p>
                                </div>
                            </div>
                            {pointingTask.note && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>📝 Note</p>
                                    <p style={{ margin: '0', fontSize: '13px', color: '#333', fontStyle: 'italic' }}>{pointingTask.note}</p>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark }}>
                                    Select Team *
                                </label>
                                <select
                                    value={pointForm.teamId}
                                    onChange={(e) => setPointForm({ ...pointForm, teamId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">-- Choose a team --</option>
                                    {teams.map(team => (
                                        <option key={team._id} value={team._id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark }}>
                                    Points * (max: {pointingTask.maxPoints})
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter points (0 or more)"
                                    value={pointForm.points}
                                    min="0"
                                    max={pointingTask.maxPoints}
                                    onChange={(e) => setPointForm({ ...pointForm, points: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        border: pointForm.points > pointingTask.maxPoints ? `2px solid ${COLORS.danger}` : '1px solid #ccc',
                                        boxSizing: 'border-box',
                                        fontSize: '14px',
                                        backgroundColor: pointForm.points > pointingTask.maxPoints ? 'rgba(211, 47, 47, 0.05)' : '#fff'
                                    }}
                                />
                                {pointForm.points > pointingTask.maxPoints && (
                                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: COLORS.danger, fontWeight: '600' }}>❌ Exceeds max points!</p>
                                )}
                            </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark }}>
                                Comment (optional)
                            </label>
                            <textarea
                                placeholder="Add a comment..."
                                value={pointForm.comment}
                                onChange={(e) => setPointForm({ ...pointForm, comment: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc',
                                    minHeight: '60px',
                                    boxSizing: 'border-box',
                                    fontSize: '14px',
                                    fontFamily: 'Arial'
                                }}
                            />
                        </div>
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                            <button
                                onClick={submitPoint}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    backgroundColor: COLORS.success,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                ✓ Assign Points
                            </button>
                            <button
                                onClick={() => {
                                    setPointingTask(null);
                                    setPointForm({ teamId: '', points: '', comment: '' });
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    backgroundColor: COLORS.primary,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </div>
                )}

                {['Day 1', 'Day 2', 'Day 3'].map(day => (
                    <div key={day} style={{ marginBottom: '40px' }}>
                        <div
                            onClick={() => setCollapsedDays({ ...collapsedDays, [day]: !collapsedDays[day] })}
                            style={{
                                color: COLORS.dark,
                                borderBottom: `3px solid ${COLORS.accent}`,
                                paddingBottom: '10px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'background-color 0.2s ease',
                                padding: '10px',
                                marginLeft: '-10px',
                                marginRight: '-10px',
                                paddingLeft: '10px',
                                paddingRight: '10px',
                                borderRadius: '5px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ fontSize: '24px' }}>
                                {collapsedDays[day] ? '▶' : '▼'}
                            </span>
                            <h2 style={{ color: COLORS.dark, margin: '0', flex: 1 }}>
                                📅 {day} ({Object.values(tasksByDayAndCategory[day] || {}).reduce((sum, tasks) => sum + tasks.length, 0)} tasks)
                            </h2>
                        </div>
                        {!collapsedDays[day] && (
                            <>
                                {Object.keys(tasksByDayAndCategory[day] || {}).length > 0 ? (
                                    <div>
                                        {Object.keys(tasksByDayAndCategory[day]).map(category => {
                                            const categoryKey = `${day}-${category}`;
                                            const isCategoryCollapsed = collapsedCategories[categoryKey] !== false; // Default to collapsed (true)

                                            return (
                                                <div key={categoryKey} style={{ marginBottom: '25px' }}>
                                                    <div
                                                        onClick={() => setCollapsedCategories({ ...collapsedCategories, [categoryKey]: !isCategoryCollapsed })}
                                                        style={{
                                                            color: COLORS.primary,
                                                            borderLeft: `4px solid ${COLORS.primary}`,
                                                            paddingLeft: '12px',
                                                            marginBottom: '15px',
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
                                                        <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                                                            📂 {category} ({tasksByDayAndCategory[day][category].length} tasks)
                                                        </h3>
                                                    </div>
                                                    {!isCategoryCollapsed && (
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                                            gap: '15px'
                                                        }}>
                                                            {tasksByDayAndCategory[day][category].map(taskObj => (
                                                                <div key={taskObj._id} style={{
                                                                    backgroundColor: '#fff',
                                                                    padding: '15px',
                                                                    borderRadius: '8px',
                                                                    border: `2px solid ${COLORS.accent}`,
                                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                                }}>
                                                                    <h4 style={{ margin: '0 0 10px 0', color: COLORS.dark }}>{taskObj.name}</h4>
                                                                    <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}>📂 Category: <strong>{taskObj.category || 'N/A'}</strong></p>
                                                                    {taskObj.isAllDay ? (
                                                                        <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}>⏰ <strong>All Day</strong></p>
                                                                    ) : (
                                                                        taskObj.startTime && taskObj.endTime && (
                                                                            <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}>🕐 {taskObj.startTime} - {taskObj.endTime}</p>
                                                                        )
                                                                    )}
                                                                    <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}>⭐ Points: <strong>{taskObj.maxPoints}</strong></p>
                                                                    {taskObj.note && <p style={{ margin: '5px 0', color: '#666', fontSize: '12px', fontStyle: 'italic' }}>Note: {taskObj.note}</p>}
                                                                    {taskObj.assignedOrganizers && taskObj.assignedOrganizers.length > 0 && (
                                                                        <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>
                                                                            👤 Organizers: <strong>{taskObj.assignedOrganizers.map(org => org.username).join(', ')}</strong>
                                                                        </p>
                                                                    )}
                                                                    <p style={{ margin: '5px 0', color: '#999', fontSize: '11px' }}>Created: {new Date(taskObj.createdAt).toLocaleDateString()}</p>
                                                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                                                        <button
                                                                            onClick={() => {
                                                                                setPointingTask(taskObj);
                                                                                setPointForm({ teamId: '', points: '', comment: '' });
                                                                            }}
                                                                            style={{ flex: 1, padding: '8px', backgroundColor: COLORS.success, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                                                                        >
                                                                            ⭐ Point
                                                                        </button>
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
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p style={{ color: '#999', fontStyle: 'italic' }}>No tasks for this day</p>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        );
    };

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

    const renderScores = () => {
        // Sort scores by newest first (descending order by createdAt)
        let sortedScores = [...scores].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply filters
        if (scoreFilterTeam) {
            sortedScores = sortedScores.filter(score => score.teamId?._id === scoreFilterTeam);
        }
        if (scoreFilterTask) {
            sortedScores = sortedScores.filter(score => score.taskId?._id === scoreFilterTask);
        }

        // Group scores by task day
        const scoresByDay = {
            'Day 1': [],
            'Day 2': [],
            'Day 3': []
        };

        // Group by day
        sortedScores.forEach(score => {
            const day = score.taskId?.day || 'Day 1';
            if (scoresByDay[day]) {
                scoresByDay[day].push(score);
            }
        });

        // Get unique teams and tasks from all scores for filter dropdowns
        const uniqueTeams = [...new Map(scores.map(score => [score.teamId?._id, score.teamId])).values()].filter(t => t);
        const uniqueTasks = [...new Map(scores.map(score => [score.taskId?._id, score.taskId])).values()].filter(t => t);

        return (
            <div>
                {/* Filter Controls */}
                <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '25px',
                    border: `1px solid ${COLORS.primary}`
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: COLORS.dark }}>🔍 Filter Scores</h3>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark, fontSize: '13px' }}>
                                Filter by Team
                            </label>
                            <select
                                value={scoreFilterTeam}
                                onChange={(e) => setScoreFilterTeam(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc',
                                    boxSizing: 'border-box',
                                    backgroundColor: '#fff',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="">All Teams</option>
                                {uniqueTeams.map(team => (
                                    <option key={team._id} value={team._id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark, fontSize: '13px' }}>
                                Filter by Task
                            </label>
                            <select
                                value={scoreFilterTask}
                                onChange={(e) => setScoreFilterTask(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc',
                                    boxSizing: 'border-box',
                                    backgroundColor: '#fff',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="">All Tasks</option>
                                {uniqueTasks.map(task => (
                                    <option key={task._id} value={task._id}>
                                        {task.name}{task.day ? ` (${task.day})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                setScoreFilterTeam('');
                                setScoreFilterTask('');
                            }}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: COLORS.secondary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px'
                            }}
                        >
                            Clear Filters
                        </button>
                        <button
                            onClick={() => {
                                setEditingScore(null);
                                setScoreForm({ teamId: '', taskId: '', points: '', comment: '' });
                                setShowNewScoreForm(!showNewScoreForm);
                            }}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: COLORS.success,
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px'
                            }}
                        >
                            + New Score
                        </button>
                    </div>
                </div>

                {/* New/Edit Score Form */}
                {(showNewScoreForm || editingScore) && (
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '25px',
                        border: `2px solid ${COLORS.accent}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: COLORS.dark }}>
                            {editingScore ? '✏️ Edit Score' : '➕ Create New Score'}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark, fontSize: '13px' }}>
                                    Task
                                </label>
                                <select
                                    value={scoreForm.taskId}
                                    onChange={(e) => setScoreForm({ ...scoreForm, taskId: e.target.value })}
                                    disabled={!!editingScore}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        border: `2px solid ${scoreForm.taskId ? COLORS.primary : '#ccc'}`,
                                        boxSizing: 'border-box',
                                        backgroundColor: '#fff',
                                        fontSize: '13px'
                                    }}
                                >
                                    <option value="">Select Task</option>
                                    {tasks.map(task => (
                                        <option key={task._id} value={task._id}>
                                            {task.name}{task.day ? ` (${task.day})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark, fontSize: '13px' }}>
                                    Team
                                </label>
                                <select
                                    value={scoreForm.teamId}
                                    onChange={(e) => setScoreForm({ ...scoreForm, teamId: e.target.value })}
                                    disabled={!!editingScore}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        border: `2px solid ${scoreForm.teamId ? COLORS.primary : '#ccc'}`,
                                        boxSizing: 'border-box',
                                        backgroundColor: '#fff',
                                        fontSize: '13px'
                                    }}
                                >
                                    <option value="">Select Team</option>
                                    {teams.filter(t => !t.deleted).map(team => (
                                        <option key={team._id} value={team._id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark, fontSize: '13px' }}>
                                    Points
                                </label>
                                <input
                                    type="number"
                                    value={scoreForm.points}
                                    onChange={(e) => setScoreForm({ ...scoreForm, points: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        border: `2px solid ${parseInt(scoreForm.points) > (scoreForm.taskId ? tasks.find(t => t._id === scoreForm.taskId)?.maxPoints || 0 : 0) ? COLORS.danger : '#ccc'}`,
                                        boxSizing: 'border-box',
                                        backgroundColor: '#fff',
                                        fontSize: '13px'
                                    }}
                                    placeholder="0"
                                />
                                {scoreForm.taskId && parseInt(scoreForm.points) > tasks.find(t => t._id === scoreForm.taskId)?.maxPoints && (
                                    <p style={{ color: COLORS.danger, fontSize: '12px', margin: '4px 0 0 0' }}>
                                        ❌ Exceeds max points!
                                    </p>
                                )}
                            </div>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: COLORS.dark, fontSize: '13px' }}>
                                Comment (optional)
                            </label>
                            <textarea
                                value={scoreForm.comment}
                                onChange={(e) => setScoreForm({ ...scoreForm, comment: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc',
                                    boxSizing: 'border-box',
                                    fontSize: '13px',
                                    fontFamily: 'inherit',
                                    minHeight: '80px'
                                }}
                                placeholder="Add any notes or comments..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    if (editingScore) {
                                        handleUpdateScore();
                                    } else {
                                        handleCreateScore();
                                    }
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: COLORS.success,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                {editingScore ? '✓ Update Score' : '✓ Create Score'}
                            </button>
                            <button
                                onClick={() => {
                                    setEditingScore(null);
                                    setShowNewScoreForm(false);
                                    setScoreForm({ teamId: '', taskId: '', points: '', comment: '' });
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: COLORS.secondary,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </div>
                )}

                {scoreFilterTeam || scoreFilterTask ? (
                    <p style={{ color: '#666', marginBottom: '20px', fontStyle: 'italic' }}>
                        ✓ Showing {sortedScores.length} scores
                    </p>
                ) : null}

                {['Day 1', 'Day 2', 'Day 3'].map(day => (
                    <div key={day} style={{ marginBottom: '40px' }}>
                        <div
                            onClick={() => setCollapsedDays({ ...collapsedDays, [day]: !collapsedDays[day] })}
                            style={{
                                color: COLORS.dark,
                                borderBottom: `3px solid ${COLORS.accent}`,
                                paddingBottom: '10px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'background-color 0.2s ease',
                                padding: '10px',
                                marginLeft: '-10px',
                                marginRight: '-10px',
                                paddingLeft: '10px',
                                paddingRight: '10px',
                                borderRadius: '5px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ fontSize: '24px' }}>
                                {collapsedDays[day] ? '▶' : '▼'}
                            </span>
                            <h2 style={{ color: COLORS.dark, margin: '0', flex: 1 }}>
                                📅 {day} ({scoresByDay[day].length} scores)
                            </h2>
                        </div>
                        {!collapsedDays[day] && (
                            <>
                                {scoresByDay[day].length > 0 ? (
                                    <div style={{
                                        backgroundColor: '#fff',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}>
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
                                                            fontWeight: '600',
                                                            borderRight: '1px solid #e0e0e0'
                                                        }}>Date Submitted</th>
                                                        <th style={{
                                                            padding: '15px',
                                                            textAlign: 'center',
                                                            fontWeight: '600'
                                                        }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {scoresByDay[day].map((score, idx) => (
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
                                                            <td style={{
                                                                padding: '15px',
                                                                textAlign: 'center',
                                                                display: 'flex',
                                                                gap: '8px',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingScore(score);
                                                                        setScoreForm({
                                                                            teamId: score.teamId._id,
                                                                            taskId: score.taskId._id,
                                                                            points: score.points.toString(),
                                                                            comment: score.comment || ''
                                                                        });
                                                                    }}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        backgroundColor: COLORS.info,
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                        fontWeight: '600'
                                                                    }}
                                                                    title="Edit score"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm('Delete this score?')) {
                                                                            handleDeleteScore(score._id);
                                                                        }
                                                                    }}
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
                                                                    title="Delete score"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: '#999', fontStyle: 'italic' }}>No scores for this day</p>
                                )}
                            </>
                        )}
                    </div>
                ))}

                {/* Deleted Scores Section */}
                {deletedScores.length > 0 && (
                    <div style={{ marginTop: '40px' }}>
                        <div
                            onClick={() => setShowDeletedScores(!showDeletedScores)}
                            style={{
                                color: COLORS.danger,
                                borderBottom: `3px solid ${COLORS.danger}`,
                                paddingBottom: '10px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'background-color 0.2s ease',
                                padding: '10px',
                                marginLeft: '-10px',
                                marginRight: '-10px',
                                paddingLeft: '10px',
                                paddingRight: '10px',
                                borderRadius: '5px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ fontSize: '24px' }}>
                                {showDeletedScores ? '▼' : '▶'}
                            </span>
                            <h2 style={{ color: COLORS.danger, margin: '0', flex: 1 }}>
                                🗑️ Deleted Scores ({deletedScores.length})
                            </h2>
                        </div>

                        {showDeletedScores && (
                            <div style={{
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                border: `2px solid ${COLORS.danger}`
                            }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '14px'
                                    }}>
                                        <thead>
                                            <tr style={{
                                                backgroundColor: COLORS.danger,
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
                                                    fontWeight: '600',
                                                    borderRight: '1px solid #e0e0e0'
                                                }}>Deleted</th>
                                                <th style={{
                                                    padding: '15px',
                                                    textAlign: 'center',
                                                    fontWeight: '600'
                                                }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deletedScores.map((score, idx) => (
                                                <tr key={score._id} style={{
                                                    borderBottom: '1px solid #e0e0e0',
                                                    backgroundColor: idx % 2 === 0 ? '#faf5f5' : 'white',
                                                    opacity: 0.8
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
                                                        color: COLORS.warning,
                                                        fontSize: '16px'
                                                    }}>
                                                        +{score.points}
                                                    </td>
                                                    <td style={{
                                                        padding: '15px',
                                                        color: '#666',
                                                        fontSize: '13px',
                                                        borderRight: '1px solid #e0e0e0'
                                                    }}>
                                                        {new Date(score.updatedAt).toLocaleDateString()} {new Date(score.updatedAt).toLocaleTimeString()}
                                                    </td>
                                                    <td style={{
                                                        padding: '15px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('Restore this score?')) {
                                                                    handleRestoreScore(score._id);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '6px 12px',
                                                                backgroundColor: COLORS.success,
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px',
                                                                fontWeight: '600'
                                                            }}
                                                            title="Restore score"
                                                        >
                                                            ↩️ Restore
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {scores.length === 0 && (
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
    };

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
            // Clear input fields
            const memberInput = document.getElementById('memberInput');
            const memberTypeSelect = document.getElementById('memberTypeSelect');
            if (memberInput) memberInput.value = '';
            if (memberTypeSelect) memberTypeSelect.value = 'MEMBER';
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
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <h3 style={{ margin: 0, color: COLORS.dark }}>Manage Teams ({teams.length})</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                                👥 Team Leaders <span style={{ fontWeight: '400', color: '#999' }}>(1 CSK + 1 CSKH)</span>
                            </label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    id="memberInput"
                                    placeholder="Enter member name"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            const memberName = e.target.value.trim();
                                            const memberType = document.getElementById('memberTypeSelect')?.value;
                                            const memberExists = teamForm.members.some(m => m.name === memberName);

                                            if (!memberName) {
                                                setError('Please enter a member name');
                                                setTimeout(() => setError(''), 2000);
                                            } else if (memberExists) {
                                                setError('Member already added');
                                                setTimeout(() => setError(''), 2000);
                                            } else if (memberType === 'CSK' && teamForm.members.some(m => m.type === 'CSK')) {
                                                setError('Team already has a CSK member');
                                                setTimeout(() => setError(''), 2000);
                                            } else if (memberType === 'CSKH' && teamForm.members.some(m => m.type === 'CSKH')) {
                                                setError('Team already has a CSKH member');
                                                setTimeout(() => setError(''), 2000);
                                            } else {
                                                setTeamForm({
                                                    ...teamForm,
                                                    members: [...teamForm.members, { name: memberName, type: memberType }]
                                                });
                                                e.target.value = '';
                                                document.getElementById('memberTypeSelect').value = 'MEMBER';
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
                                <select
                                    id="memberTypeSelect"
                                    defaultValue="MEMBER"
                                    style={{
                                        padding: '10px',
                                        border: `2px solid ${COLORS.accent}`,
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        backgroundColor: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="MEMBER">👤 Player</option>
                                    <option value="CSK">👨‍💼 CSK</option>
                                    <option value="CSKH">👩‍💼 CSKH</option>
                                </select>
                                <button
                                    onClick={() => {
                                        const input = document.getElementById('memberInput');
                                        const memberName = input.value.trim();
                                        const memberType = document.getElementById('memberTypeSelect')?.value;
                                        const memberExists = teamForm.members.some(m => m.name === memberName);

                                        if (!memberName) {
                                            setError('Please enter a member name');
                                            setTimeout(() => setError(''), 2000);
                                        } else if (memberExists) {
                                            setError('Member already added');
                                            setTimeout(() => setError(''), 2000);
                                        } else if (memberType === 'CSK' && teamForm.members.some(m => m.type === 'CSK')) {
                                            setError('Team already has a CSK member');
                                            setTimeout(() => setError(''), 2000);
                                        } else if (memberType === 'CSKH' && teamForm.members.some(m => m.type === 'CSKH')) {
                                            setError('Team already has a CSKH member');
                                            setTimeout(() => setError(''), 2000);
                                        } else {
                                            setTeamForm({
                                                ...teamForm,
                                                members: [...teamForm.members, { name: memberName, type: memberType }]
                                            });
                                            input.value = '';
                                            document.getElementById('memberTypeSelect').value = 'MEMBER';
                                            setError('');
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
                                    {teamForm.members.map((member, idx) => {
                                        const typeColors = {
                                            'CSK': '#FF6B6B',
                                            'CSKH': '#4ECDC4',
                                            'MEMBER': '#95E1D3'
                                        };
                                        const typeEmojis = {
                                            'CSK': '👨‍💼',
                                            'CSKH': '👩‍💼',
                                            'MEMBER': '👤'
                                        };
                                        const type = member.type;
                                        return (
                                            <div key={idx} style={{
                                                backgroundColor: typeColors[type],
                                                color: 'white',
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '13px',
                                                fontWeight: '600'
                                            }}>
                                                {typeEmojis[type]} {member.name} ({type})
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
                                        );
                                    })}
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

                {teamsListOpen && (
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: `2px solid ${COLORS.primary}`,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '15px',
                        padding: '20px'
                    }}>
                        {teams.length > 0 ? (
                            teams.map(team => (
                                <div key={team._id} style={{
                                    backgroundColor: '#f9f9f9',
                                    borderRadius: '8px',
                                    border: `2px solid ${COLORS.accent}`,
                                    padding: '15px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s ease'
                                }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    <h4 style={{ margin: '0 0 10px 0', color: COLORS.dark, fontSize: '16px', fontWeight: '700' }}>
                                        {team.name}
                                    </h4>
                                    <div style={{
                                        backgroundColor: '#f0f0f0',
                                        padding: '10px',
                                        borderRadius: '6px',
                                        marginBottom: '12px'
                                    }}>
                                        <p style={{
                                            margin: '0',
                                            color: COLORS.success,
                                            fontSize: '16px',
                                            fontWeight: '700'
                                        }}>
                                            ⭐ Total Score: {team.totalScore}
                                        </p>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <p style={{
                                            margin: '0 0 8px 0',
                                            fontWeight: '600',
                                            color: COLORS.dark,
                                            fontSize: '13px'
                                        }}>
                                            👥 Members:
                                        </p>
                                        {team.members && team.members.length > 0 ? (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {team.members.map((member, midx) => {
                                                    const typeColors = {
                                                        'CSK': '#FF6B6B',
                                                        'CSKH': '#4ECDC4',
                                                        'MEMBER': '#95E1D3'
                                                    };
                                                    const typeEmojis = {
                                                        'CSK': '👨‍💼',
                                                        'CSKH': '👩‍💼',
                                                        'MEMBER': '👤'
                                                    };
                                                    const type = member.type;
                                                    return (
                                                        <span key={midx} style={{
                                                            backgroundColor: typeColors[type],
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {typeEmojis[type]} {member.name} ({type})
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : <p style={{ margin: '0', color: '#999', fontSize: '13px' }}>No members</p>}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                setEditingTeam(team);
                                                setTeamForm({ name: team.name, members: team.members || [] });
                                                setShowTeamForm(true);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                backgroundColor: COLORS.warning,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTeam(team._id)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
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
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{
                                gridColumn: '1 / -1',
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: '#666',
                                fontSize: '14px'
                            }}>
                                No teams created yet. Create your first team!
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderUserHistory = () => {
        // Get unique usernames from history with their roles
        const uniqueUsers = Array.from(new Map(
            userHistory.map(h => [h.username, h])
        ).values())
            .sort((a, b) => {
                // Sort admins first, then by username
                if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                return a.username.localeCompare(b.username);
            });

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
            <div style={{ display: 'flex', gap: '20px', minHeight: '100%', flexDirection: 'row', flexWrap: 'nowrap' }}>
                {/* Left Sidebar - User List - Mobile Toggle */}
                <div style={{
                    width: '250px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: `2px solid ${COLORS.primary}`,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    '@media (max-width: 768px)': {
                        width: historySidebarOpen ? '100%' : 'auto',
                        position: historySidebarOpen ? 'relative' : 'absolute',
                        maxHeight: historySidebarOpen ? '400px' : 'auto'
                    }
                }} className="history-sidebar">
                    <div style={{
                        backgroundColor: COLORS.primary,
                        color: 'white',
                        padding: '12px 15px',
                        fontWeight: '600',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '14px'
                    }}>
                        👥 Users
                        <button
                            onClick={() => setHistorySidebarOpen(!historySidebarOpen)}
                            style={{
                                display: 'none',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '0',
                                fontWeight: '700'
                            }}
                            className="history-sidebar-toggle"
                        >
                            {historySidebarOpen ? '▼' : '▶'}
                        </button>
                    </div>
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: historySidebarOpen ? 'block' : 'none'
                    }} className="history-sidebar-content">
                        <button
                            onClick={() => {
                                setSelectedUserForHistory(null);
                                setHistorySearchText('');
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 15px',
                                textAlign: 'left',
                                backgroundColor: !selectedUserForHistory ? COLORS.accent : 'transparent',
                                color: !selectedUserForHistory ? 'white' : COLORS.dark,
                                border: 'none',
                                borderBottom: '1px solid #eee',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: !selectedUserForHistory ? '600' : '500',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                if (selectedUserForHistory) e.target.style.backgroundColor = '#f0f0f0';
                            }}
                            onMouseOut={(e) => {
                                if (selectedUserForHistory) e.target.style.backgroundColor = 'transparent';
                            }}
                        >
                            📋 All Users
                        </button>
                        {uniqueUsers.map(userRecord => (
                            <button
                                key={userRecord.username}
                                onClick={() => {
                                    setSelectedUserForHistory(userRecord.username);
                                    setHistorySidebarOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 15px',
                                    textAlign: 'left',
                                    backgroundColor: selectedUserForHistory === userRecord.username ? COLORS.accent : 'transparent',
                                    color: selectedUserForHistory === userRecord.username ? 'white' : COLORS.dark,
                                    border: 'none',
                                    borderBottom: '1px solid #eee',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: selectedUserForHistory === userRecord.username ? '600' : '500',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (selectedUserForHistory !== userRecord.username) {
                                        e.target.style.backgroundColor = '#f0f0f0';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (selectedUserForHistory !== userRecord.username) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {userRecord.username}
                                        {userRecord.role === 'ADMIN' && (
                                            <span style={{
                                                backgroundColor: selectedUserForHistory === userRecord.username ? 'rgba(255,255,255,0.3)' : '#d32f2f',
                                                color: selectedUserForHistory === userRecord.username ? 'white' : 'white',
                                                padding: '1px 5px',
                                                borderRadius: '2px',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                👑
                                            </span>
                                        )}
                                    </span>
                                    <span style={{
                                        backgroundColor: selectedUserForHistory === userRecord.username ? 'rgba(255,255,255,0.4)' : '#ddd',
                                        color: selectedUserForHistory === userRecord.username ? 'white' : '#666',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        minWidth: '24px',
                                        textAlign: 'center'
                                    }}>
                                        {userHistory.filter(h => h.username === userRecord.username).length}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Main Area - History */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="history-main-area">
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
                        overflow: 'visible',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0
                    }}>
                        <div style={{
                            backgroundColor: COLORS.primary,
                            color: 'white',
                            padding: '15px',
                            fontWeight: '600'
                        }}>
                            {selectedUserForHistory ? `📜 ${selectedUserForHistory}'s Activity History` : '📜 All User Activities'}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', alignContent: 'flex-start', WebkitOverflowScrolling: 'touch', touchAction: 'auto', WebkitTouchCallout: 'none' }} className="history-cards-container">
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
                                                {item.action === 'DELETE_SCORE' && '🗑️ Score Deleted'}
                                                {item.action === 'CREATE_TASK' && '📝 Task Created'}
                                                {item.action === 'UPDATE_TASK' && '✏️ Task Updated'}
                                            </h4>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                {item.role === 'ADMIN' && (
                                                    <span style={{
                                                        backgroundColor: '#d32f2f',
                                                        color: 'white',
                                                        padding: '3px 8px',
                                                        borderRadius: '3px',
                                                        fontSize: '10px',
                                                        fontWeight: '700',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        👑 ADMIN
                                                    </span>
                                                )}
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

                {/* Mobile Media Query Styles */}
                <style>{`
                    .history-cards-container {
                        scroll-behavior: smooth;
                        -webkit-overflow-scrolling: touch;
                        overscroll-behavior: contain;
                    }
                    @media (max-width: 768px) {
                        .history-sidebar {
                            width: 100% !important;
                            margin-bottom: 0 !important;
                            position: relative !important;
                            order: 2 !important;
                        }
                        .history-sidebar-toggle {
                            display: block !important;
                        }
                        .history-sidebar-content {
                            max-height: ${historySidebarOpen ? 'none' : '0'} !important;
                            overflow: ${historySidebarOpen ? 'auto' : 'hidden'} !important;
                            transition: all 0.3s ease !important;
                        }
                        .history-main-area {
                            width: 100% !important;
                            order: 1 !important;
                            min-width: 100% !important;
                        }
                    }
                    @media (min-width: 769px) {
                        .history-sidebar-content {
                            display: block !important;
                        }
                    }
                `}</style>
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
            backgroundColor: '#f5f5f5',
            position: 'relative'
        }}>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999,
                        display: 'none'
                    }}
                    onClick={() => setSidebarOpen(false)}
                    className="mobile-overlay"
                />
            )}

            {/* Sidebar */}
            <div style={{
                width: '250px',
                backgroundColor: COLORS.dark,
                color: 'white',
                padding: '20px',
                boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
                overflowY: 'auto',
                position: 'relative',
                zIndex: 1000,
                transition: 'transform 0.3s ease',
                '@media (max-width: 768px)': {
                    position: 'fixed',
                    top: 0,
                    left: sidebarOpen ? 0 : '-250px',
                    height: '100vh',
                    borderRadius: 0
                }
            }} className="admin-sidebar">
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
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSidebarOpen(false);
                            }}
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

                {/* Change Password Section in Main Sidebar */}
                <div style={{
                    marginBottom: '20px',
                    paddingTop: '15px',
                    borderTop: `2px solid ${COLORS.primary}`
                }}>
                    {!showChangePassword ? (
                        <button
                            onClick={() => {
                                setShowChangePassword(true);
                                setPasswordError('');
                                setPasswordSuccess('');
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 15px',
                                backgroundColor: COLORS.info,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#1976d2';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = COLORS.info;
                            }}
                        >
                            🔐 Change Password
                        </button>
                    ) : (
                        <div style={{
                            backgroundColor: COLORS.light,
                            padding: '15px',
                            borderRadius: '8px',
                            border: `2px solid ${COLORS.info}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px'
                            }}>
                                <h4 style={{
                                    margin: 0,
                                    fontSize: '13px',
                                    color: COLORS.dark,
                                    fontWeight: '700'
                                }}>
                                    🔐 Change Password
                                </h4>
                                <button
                                    onClick={() => setShowChangePassword(false)}
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        color: '#999',
                                        padding: 0
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Password Error Message */}
                            {passwordError && (
                                <div style={{
                                    backgroundColor: '#ffebee',
                                    border: `1px solid ${COLORS.danger}`,
                                    color: COLORS.danger,
                                    padding: '8px',
                                    borderRadius: '6px',
                                    marginBottom: '10px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                }}>
                                    ⚠️ {passwordError}
                                </div>
                            )}

                            {/* Password Success Message */}
                            {passwordSuccess && (
                                <div style={{
                                    backgroundColor: '#e8f5e9',
                                    border: `1px solid ${COLORS.success}`,
                                    color: COLORS.success,
                                    padding: '8px',
                                    borderRadius: '6px',
                                    marginBottom: '10px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                }}>
                                    {passwordSuccess}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} style={{
                                display: 'grid',
                                gap: '10px'
                            }}>
                                {/* Current Password Field */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '4px',
                                        color: COLORS.dark,
                                        fontWeight: '600',
                                        fontSize: '12px'
                                    }}>
                                        Current *
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Current password"
                                        value={passwordForm.oldPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: `1px solid ${COLORS.secondary}`,
                                            borderRadius: '6px',
                                            fontSize: '12px',
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
                                        marginBottom: '4px',
                                        color: COLORS.dark,
                                        fontWeight: '600',
                                        fontSize: '12px'
                                    }}>
                                        New *
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="New password (min 6 chars)"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: `1px solid ${COLORS.secondary}`,
                                            borderRadius: '6px',
                                            fontSize: '12px',
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
                                        marginBottom: '4px',
                                        color: COLORS.dark,
                                        fontWeight: '600',
                                        fontSize: '12px'
                                    }}>
                                        Confirm *
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: `1px solid ${COLORS.secondary}`,
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.3s ease'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = COLORS.accent}
                                        onBlur={(e) => e.target.style.borderColor = COLORS.secondary}
                                        disabled={passwordLoading}
                                    />
                                </div>

                                {/* Form Buttons */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '8px',
                                    marginTop: '10px'
                                }}>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        style={{
                                            padding: '8px',
                                            backgroundColor: passwordLoading ? '#ccc' : COLORS.success,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: passwordLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = '#45a049';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = COLORS.success;
                                            }
                                        }}
                                    >
                                        {passwordLoading ? '⏳' : '💾'}
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
                                            padding: '8px',
                                            backgroundColor: '#ccc',
                                            color: COLORS.dark,
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: passwordLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = '#bbb';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!passwordLoading) {
                                                e.target.style.backgroundColor = '#ccc';
                                            }
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

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

            {/* Main Content */}
            <div style={{ flex: 1, padding: '30px', overflowY: 'auto', position: 'relative' }}>
                {/* Mobile Menu Button - Top Right */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{
                        display: 'none',
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        backgroundColor: COLORS.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        fontSize: '20px',
                        zIndex: 1001,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        '@media (max-width: 768px)': {
                            display: 'block'
                        }
                    }}
                    className="mobile-menu-btn"
                    title={sidebarOpen ? 'Close menu' : 'Open menu'}
                >
                    {sidebarOpen ? '✕' : '☰'}
                </button>

                <div style={{ marginBottom: '30px', paddingTop: '20px' }}>
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

            {/* Mobile Media Query Styles */}
            <style>{`
                @media (max-width: 768px) {
                    .admin-sidebar {
                        position: fixed !important;
                        top: 0 !important;
                        left: ${sidebarOpen ? '0' : '-250px'} !important;
                        height: 100vh !important;
                        width: 250px !important;
                        z-index: 1000 !important;
                    }
                    .mobile-menu-btn {
                        display: block !important;
                        position: fixed !important;
                        top: 20px !important;
                        right: 20px !important;
                    }
                    .mobile-overlay {
                        display: block !important;
                    }
                    .history-sidebar-toggle {
                        display: block !important;
                    }
                }
            `}</style>
        </div>
    );
}
