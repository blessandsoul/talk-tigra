import { useEffect, useState } from 'react';
import { Card, Typography, Statistic, Row, Col, Progress, Table, Tag, Button, Alert, message, Space, Popconfirm } from 'antd';
import { ReloadOutlined, DeleteOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../config';

const { Title } = Typography;

interface QueueStats {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    messages: Array<{
        id: string;
        phoneNumber: string;
        status: 'pending' | 'sent' | 'failed';
        attempts: number;
        createdAt: string;
        sentAt?: string;
    }>;
}

export const MessageQueueDashboard = () => {
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/messages/queue/stats`);
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            } else {
                message.error('Failed to fetch queue statistics');
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            message.error('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const clearCompleted = async () => {
        setClearing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/messages/queue/completed`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                message.success(`${data.data.clearedCount} completed messages cleared`);
                fetchStats();
            } else {
                message.error('Failed to clear completed messages');
            }
        } catch (error) {
            console.error('Error clearing messages:', error);
            message.error('Error connecting to server');
        } finally {
            setClearing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const columns = [
        {
            title: 'Phone Number',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                let color = 'default';
                let icon = <ClockCircleOutlined />;
                if (status === 'sent') {
                    color = 'success';
                    icon = <CheckCircleOutlined />;
                } else if (status === 'failed') {
                    color = 'error';
                    icon = <CloseCircleOutlined />;
                }
                return (
                    <Tag icon={icon} color={color}>
                        {status.toUpperCase()}
                    </Tag>
                );
            },
        },
        {
            title: 'Attempts',
            dataIndex: 'attempts',
            key: 'attempts',
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleString(),
        },
        {
            title: 'Sent At',
            dataIndex: 'sentAt',
            key: 'sentAt',
            render: (date?: string) => date ? new Date(date).toLocaleString() : '-',
        },
    ];

    if (!stats) {
        return (
            <Card loading={true}>
                <p>Loading queue statistics...</p>
            </Card>
        );
    }

    const percentComplete = stats.total > 0
        ? Math.round(((stats.sent + stats.failed) / stats.total) * 100)
        : 0;

    return (
        <Card
            title={<Title level={4}>Message Queue Dashboard</Title>}
            extra={
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchStats}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                    <Popconfirm
                        title="Clear Completed Messages"
                        description="Are you sure you want to clear all sent and failed messages?"
                        onConfirm={clearCompleted}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            icon={<DeleteOutlined />}
                            loading={clearing}
                            disabled={stats.sent === 0 && stats.failed === 0}
                            danger
                        >
                            Clear Completed
                        </Button>
                    </Popconfirm>
                </Space>
            }
        >
            <Alert
                message="Message Queue Status"
                description={`Processing messages at a rate of 1 message every 20 seconds. ${stats.pending} messages pending.`}
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic title="Total Messages" value={stats.total} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Pending" value={stats.pending} valueStyle={{ color: '#1890ff' }} prefix={<ClockCircleOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Sent" value={stats.sent} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Failed" value={stats.failed} valueStyle={{ color: '#cf1322' }} prefix={<CloseCircleOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Card title="Progress" style={{ marginBottom: 24 }}>
                <Progress percent={percentComplete} status={stats.failed > 0 ? 'exception' : 'active'} />
            </Card>

            <Table
                dataSource={stats.messages}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
            />
        </Card>
    );
};
