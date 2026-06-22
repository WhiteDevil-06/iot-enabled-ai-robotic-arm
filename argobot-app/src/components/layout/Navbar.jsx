import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Sun, Moon, Bell } from 'lucide-react';
import { readStoredString, writeStoredString } from '../../utils/storage';
import './Navbar.css';

const Navbar = () => {
  const [isDark, setIsDark] = useState(() => {
    return readStoredString('theme') === 'dark';
  });
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      writeStoredString('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      writeStoredString('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (!showNotifications) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <nav className="navbar border-b">
      <div className="container flex items-center justify-between h-full">
        <Link to="/" className="navbar-left flex items-center gap-2" aria-label="AgroBot AI home">
          <img src="/image.png" alt="AgroBot AI Logo" className="logo-image" />
          <span className="logo-text font-bold text-xl">AgroBot AI</span>
        </Link>

        <div className="navbar-center flex items-center gap-4">
          <NavLink to="/" className={({ isActive }) => `nav-link font-medium ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <span className="nav-separator"></span>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link font-medium ${isActive ? 'active' : ''}`}>
            Live Dashboard
          </NavLink>
          <span className="nav-separator"></span>
          <NavLink to="/reports" className={({ isActive }) => `nav-link font-medium ${isActive ? 'active' : ''}`}>
            History & Reports
          </NavLink>
          <span className="nav-separator"></span>
          <NavLink to="/control-center" className={({ isActive }) => `nav-link font-medium ${isActive ? 'active' : ''}`}>
            Control Center
          </NavLink>
        </div>

        <div className="navbar-right flex items-center gap-4">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="icon-btn" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((visible) => !visible)}>
            <Bell size={20} />
            {!showNotifications && <span className="notification-dot" aria-hidden="true"></span>}
          </button>
          {showNotifications && <div className="notification-panel card" role="status"><strong>System update</strong><span>All sorting services are operating normally.</span></div>}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
