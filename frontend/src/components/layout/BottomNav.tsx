import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Home size={26} />, path: '/' },
    { icon: <Search size={26} />, path: '/search' },
    { icon: <PlusSquare size={26} />, path: '/story/create' },
    { icon: <MessageCircle size={26} />, path: '/dm' },
    { icon: <User size={26} />, path: '/profile' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '55px',
      backgroundColor: '#fff',
      borderTop: '1px solid #dbdbdb',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? '#000' : '#8e8e8e',
              transition: 'color 0.2s ease'
            }}
          >
            {item.icon}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
