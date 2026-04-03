import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  /** 지정 시 app-shell 상한을 덮어씀 (예: 검색 페이지 600px) */
  maxWidth?: string;
  hideHeader?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title = "Devstagram", 
  maxWidth,
  hideHeader = false 
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: '60px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {!hideHeader && (
        <header style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#fff',
          borderBottom: '1px solid #dbdbdb',
          zIndex: 900
        }}>
          <div
            className="app-shell"
            style={{
              height: '60px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 20px',
            }}
          >
            <h2 
              style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', margin: 0 }} 
              onClick={() => navigate('/')}
            >
              {title}
            </h2>
          </div>
        </header>
      )}

      <main
        className="app-shell"
        style={{
          padding: '30px 20px 0',
          ...(maxWidth ? { maxWidth } : {}),
        }}
      >
        {children}
      </main>

      <BottomNav />
    </div>
  );
};

export default MainLayout;
