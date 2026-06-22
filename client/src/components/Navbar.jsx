import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand"><img src="/yerosters.jpeg" alt="YE Rosters" className="nav-logo" />YE Rosters</Link>
      <div className="nav-links">
        {user?.role === 'admin' && (
          <>
            <Link to="/employees">Employees</Link>
            <Link to="/schools">Schools</Link>
            <Link to="/roster">Roster</Link>
            <Link to="/settings">Settings</Link>
          </>
        )}
        {user?.role === 'employee' && (
          <Link to="/availability">My Availability</Link>
        )}
        <span className="nav-user">{user?.name}</span>
        <button onClick={logout} className="btn btn-sm">Logout</button>
      </div>
    </nav>
  );
}
