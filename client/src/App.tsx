import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Layout, Typography, theme, Menu } from 'antd';
import { KnownDriversTable } from './components/KnownDriversTable';
import { UnknownDriversTable } from './components/UnknownDriversTable';

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
