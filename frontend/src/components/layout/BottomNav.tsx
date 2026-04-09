import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageCircle, User, Film, ImagePlus } from 'lucide-react';
import { buildPathWithSearch } from '../../util/dmNavigation';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const currentPathWithSearch = buildPathWithSearch(location.pathname, location.search);

  const navItems = [
    { icon: <Home size={26} />, path: '/' },
    { icon: <Search size={26} />, path: '/search' },
    { 
      icon: <PlusSquare size={26} />, 
      path: '#',
      onClick: () => setShowCreateMenu(!showCreateMenu)
    },
    { icon: <MessageCircle size={26} />, path: '/dm' },
    { icon: <User size={26} />, path: '/profile' },
  ];

  return (
    <>
      {/* 생성 메뉴 팝업 */}
      {showCreateMenu && (
        <div style={{
          position: 'fixed',
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          padding: '8px',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '160px',
          border: '1px solid #efefef'
        }}>
          <button 
            onClick={() => { navigate('/story/create'); setShowCreateMenu(false); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
              border: 'none', 
              background: 'none', 
              cursor: 'pointer', 
              width: '100%', 
              borderRadius: '8px', 
              transition: 'background 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <Film size={20} color="#262626" /> 
            <span style={{ fontSize: '0.95rem', color: '#262626', fontWeight: '500' }}>스토리 생성</span>
          </button>
          
          <div style={{ height: '1px', backgroundColor: '#efefef', margin: '0 8px' }} />

          <button 
            onClick={() => { navigate('/post/create'); setShowCreateMenu(false); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
              border: 'none', 
              background: 'none', 
              cursor: 'pointer', 
              width: '100%', 
              borderRadius: '8px', 
              transition: 'background 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <ImagePlus size={20} color="#262626" /> 
            <span style={{ fontSize: '0.95rem', color: '#262626', fontWeight: '500' }}>게시물 생성</span>
          </button>
        </div>
      )}
      
      {/* 배경 클릭 시 메뉴 닫기 */}
      {showCreateMenu && (
        <div 
          onClick={() => setShowCreateMenu(false)} 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050 }} 
        />
      )}

      {/* 메인 내비게이션 바 */}
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
              onClick={
                item.onClick
                  ? item.onClick
                  : () => {
                      if (item.path === '/dm') {
                        navigate('/dm', { state: { from: currentPathWithSearch } });
                        return;
                      }
                      navigate(item.path);
                    }
              }
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (isActive || (item.path === '#' && showCreateMenu)) ? '#000' : '#8e8e8e',
                transition: 'all 0.2s ease',
                transform: (item.path === '#' && showCreateMenu) ? 'rotate(45deg)' : 'none'
              }}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default BottomNav;
