import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Layout, Typography, theme, Menu } from 'antd';
import { KnownDriversTable } from './components/KnownDriversTable';
import { UnknownDriversTable } from './components/UnknownDriversTable';
import { MessageQueueDashboard } from './components/MessageQueueDashboard';

const { Header, Content } = Layout;
const { Title } = Typography;

function AppLayout() {
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/known-drivers',
      label: <Link to="/known-drivers">Known Drivers</Link>,
    },
    {
      key: '/unknown-drivers',
      label: <Link to="/unknown-drivers">Unknown Drivers</Link>,
    },
    {
      key: '/queue-dashboard',
      label: <Link to="/queue-dashboard">Queue Dashboard</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#001529' }}>
        <Title level={3} style={{ color: 'white', margin: '0 24px 0 0' }}>
          TIGRA Drivers Dashboard
        </Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0 }}
        />
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
            <Route path="/unknown-drivers" element={<UnknownDriversTable />} />
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
