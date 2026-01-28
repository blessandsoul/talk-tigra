import { useEffect } from 'react';
import { BrowserRouter, Link, useLocation, Navigate, Route, Routes } from 'react-router-dom';
import { Layout, theme, Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { KnownDriversTable } from './components/KnownDriversTable';
import { MessageQueueDashboard } from './components/MessageQueueDashboard';
import { LanguageSwitcher } from './components/common/LanguageSwitcher';


const { Header, Content } = Layout;

function AppLayout() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const menuItems = [
    {
      key: '/known-drivers',
      label: <Link to="/known-drivers">{t('nav.driver')}</Link>,
    },
    {
      key: '/queue-dashboard',
      label: <Link to="/queue-dashboard">{t('nav.dashboard')}</Link>,
    },

  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#001529' }}>
        <img src="/tigra.webp" alt="Tigra Logo" style={{ height: 60, aspectRatio: '1/1', objectFit: 'contain', marginRight: 16 }} />
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0 }}
        />
        <LanguageSwitcher />
      </Header>
      <Content style={{ padding: '0 48px', marginTop: '24px' }}>
        <div
          style={{
            background: colorBgContainer,
            minHeight: 280,
            padding: 24,
            borderRadius: borderRadiusLG,
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/known-drivers" replace />} />
            <Route path="/known-drivers" element={<KnownDriversTable />} />
            <Route path="/queue-dashboard" element={<MessageQueueDashboard />} />

            {/* Redirect old route to new one */}
            <Route path="/bulk-messages" element={<Navigate to="/queue-dashboard" replace />} />
          </Routes>
        </div>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
