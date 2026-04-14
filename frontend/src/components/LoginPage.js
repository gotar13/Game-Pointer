import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const url = getApiUrl('/login');
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login failed');
                setLoading(false);
                return;
            }

            // Save authentication data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            onLogin(data.user);
            navigate(data.user.role === 'ADMIN' ? '/admin' : '/user');
        } catch (err) {
            setError('Network error. Make sure backend is running on port 3001');
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #877643 0%, #5a4f32 50%, #2c2416 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <form onSubmit={handleSubmit} style={{
                padding: '50px 45px',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                backgroundColor: '#faf8f3',
                border: '1px solid rgba(135, 118, 67, 0.2)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        margin: '0 0 8px 0',
                        color: '#2c2416',
                        fontWeight: '700'
                    }}>
                        Totál Kés(z)diáknapok pontozó rendszer
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#877643',
                        margin: '0',
                        fontWeight: '500'
                    }}>
                        Secure Login
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        marginBottom: '25px',
                        fontSize: '14px',
                        border: '1px solid #ef5350',
                        textAlign: 'center',
                        fontWeight: '500'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Username Field */}
                <div style={{ marginBottom: '22px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c2416',
                        fontSize: '14px'
                    }}>
                        Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        disabled={loading}
                        required
                        autoComplete="username"
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid #e8dcc8',
                            borderRadius: '10px',
                            boxSizing: 'border-box',
                            fontSize: '14px',
                            backgroundColor: '#ffffff',
                            color: '#2c2416',
                            transition: 'all 0.3s ease',
                            outline: 'none',
                            cursor: loading ? 'not-allowed' : 'text',
                            opacity: loading ? 0.7 : 1
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#877643';
                            e.target.style.boxShadow = '0 0 0 3px rgba(135, 118, 67, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#e8dcc8';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>

                {/* Password Field */}
                <div style={{ marginBottom: '30px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#2c2416',
                        fontSize: '14px'
                    }}>
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loading}
                        required
                        autoComplete="current-password"
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid #e8dcc8',
                            borderRadius: '10px',
                            boxSizing: 'border-box',
                            fontSize: '14px',
                            backgroundColor: '#ffffff',
                            color: '#2c2416',
                            transition: 'all 0.3s ease',
                            outline: 'none',
                            cursor: loading ? 'not-allowed' : 'text',
                            opacity: loading ? 0.7 : 1
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#877643';
                            e.target.style.boxShadow = '0 0 0 3px rgba(135, 118, 67, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#e8dcc8';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>

                {/* Login Button */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '13px',
                        background: loading
                            ? '#ccc'
                            : 'linear-gradient(135deg, #877643 0%, #6b5c37 100%)',
                        color: loading ? '#666' : 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: loading ? 'none' : '0 4px 15px rgba(135, 118, 67, 0.3)',
                        letterSpacing: '0.5px'
                    }}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(135, 118, 67, 0.4)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(135, 118, 67, 0.3)';
                        }
                    }}
                >
                    {loading ? '⏳ Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}
