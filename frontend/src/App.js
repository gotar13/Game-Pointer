import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import UserPage from './components/UserPage';
import AdminPage from './components/AdminPage';

function App() {
  const [user, setUser] = useState(null); // { id, username, role }
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  // Handle logout - clear session data
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const ProtectedRoute = ({ element, requiredRoles }) => {
    if (!user) return <Navigate to="/login" />;
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" />;
    }
    return element;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Login page - public route */}
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />

        {/* User dashboard - requires ORGANIZER or VOLUNTEER role */}
        <Route
          path="/user"
          element={
            <ProtectedRoute
              element={<UserPage user={user} onLogout={handleLogout} />}
              requiredRoles={['ORGANIZER', 'VOLUNTEER']}
            />
          }
        />

        {/* Admin dashboard - requires ADMIN role */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              element={<AdminPage user={user} onLogout={handleLogout} />}
              requiredRoles={['ADMIN']}
            />
          }
        />

        {/* Access denied page */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Default: redirect based on user role */}
        <Route path="/" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : user.role === 'ORGANIZER' || user.role === 'VOLUNTEER' ? '/user' : '/login'} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

function UnauthorizedPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>❌ Unauthorized Access</h1>
      <p>You don't have permission to access this page.</p>
      <a href="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>Go back to login</a>
    </div>
  );
}

export default App;
