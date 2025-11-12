import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfileDrawer from './ProfileDrawer';
import '../styles/ProfileDropdown.css';

function ProfileDropdown({ user }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setDrawerOpen(false);
    navigate('/login');
  };

  return (
    <div className="profile-dropdown">
      <button
        className="profile-avatar"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open profile menu"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="Profile" className="avatar-img" />
        ) : (
          <span className="avatar-initial">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
        )}
      </button>

      <ProfileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default ProfileDropdown;

