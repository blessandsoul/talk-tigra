import { useEffect, useState } from 'react';
import { Card, Typography, Statistic, Row, Col, Progress, Table, Tag, Button, Alert, message, Space, Popconfirm } from 'antd';
import { ReloadOutlined, DeleteOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
            message.error(t('common.error'));
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
            message.error(t('common.error'));
        } finally {
            setClearing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const columns = [
        {
            title: t('queue.phone_number'),
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
        },
        {
            title: t('common.status'),
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
            title: t('queue.attempts'),
            dataIndex: 'attempts',
            key: 'attempts',
        },
        {
            title: t('common.created_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleString(),
        },
        {
            title: t('queue.sent_at'),
            dataIndex: 'sentAt',
            key: 'sentAt',
            render: (date?: string) => date ? new Date(date).toLocaleString() : '-',
        },
    ];

    if (!stats) {
        return (
            <Card loading={true}>
                <p>{t('common.loading')}</p>
            </Card>
        );
    }

    const percentComplete = stats.total > 0
        ? Math.round(((stats.sent + stats.failed) / stats.total) * 100)
        : 0;

    return (
        <Card
            title={<Title level={4}>{t('queue.title')}</Title>}
            extra={
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchStats}
                        loading={loading}
                    >
                        {t('common.refresh')}
                    </Button>
                    <Popconfirm
                        title={t('queue.clear_confirm_title')}
                        description={t('queue.clear_confirm_desc')}
                        onConfirm={clearCompleted}
                        okText={t('common.yes')}
                        cancelText={t('common.no')}
                    >
                        <Button
                            icon={<DeleteOutlined />}
                            loading={clearing}
                            disabled={stats.sent === 0 && stats.failed === 0}
                            danger
                        >
                            {t('queue.clear_completed')}
                        </Button>
                    </Popconfirm>
                </Space>
            }
        >
            <Alert
                message="Message Queue Status"
                description={t('queue.status_info', { count: stats.pending })}
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic title={t('queue.total')} value={stats.total} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title={t('queue.pending')} value={stats.pending} valueStyle={{ color: '#1890ff' }} prefix={<ClockCircleOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title={t('queue.sent')} value={stats.sent} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title={t('queue.failed')} value={stats.failed} valueStyle={{ color: '#cf1322' }} prefix={<CloseCircleOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Card title={t('queue.progress')} style={{ marginBottom: 24 }}>
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
