import { useEffect, useState, useCallback } from 'react';
import { Table, Card, message, Button, Space, Tag, Statistic, Row, Col, Empty } from 'antd';
import type { TableProps } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, PhoneOutlined, CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface LoadInquiryDetail {
    id: string;
    loadId: string;
    vin: string | null;
    vehicleInfo: string | null;
    receivedIn: string | null;
    phoneNumber: string;
    firstSeenAt: string;
    lastSeenAt: string;
    mentionCount: number;
    driverName: string | null;
    driverCompany: string | null;
}

interface LoadDetailResponse {
    success: boolean;
    message: string;
    data: {
        loadId: string;
        driverCount: number;
        inquiries: LoadInquiryDetail[];
    };
}

export const LoadInquiryDetailPage = () => {
    const { t } = useTranslation();
    const { loadId } = useParams<{ loadId: string }>();
    const navigate = useNavigate();

    const [data, setData] = useState<LoadInquiryDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [driverCount, setDriverCount] = useState(0);

    const fetchDetail = useCallback(async () => {
        if (!loadId) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/load-inquiries/${loadId}`);
            const result: LoadDetailResponse = await response.json();

            if (result.success) {
                setData(result.data.inquiries);
                setDriverCount(result.data.driverCount);
            } else {
                message.error(t('inquiries.fetch_error'));
            }
        } catch {
            message.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [loadId, t]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const handleCopyPhone = (phone: string) => {
        navigator.clipboard.writeText(phone).then(() => {
            message.success(`Copied ${phone}`);
        });
    };

    const formatDate = (date: string): string => {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    };

    const columns: TableProps<LoadInquiryDetail>['columns'] = [
        {
            title: t('common.phone'),
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
            width: 180,
            render: (phone: string) => (
                <Button
                    type="link"
                    icon={<CopyOutlined />}
                    style={{ padding: 0, fontFamily: 'monospace' }}
                    onClick={() => handleCopyPhone(phone)}
                >
                    {phone}
                </Button>
            ),
        },
        {
            title: t('common.company'),
            dataIndex: 'driverCompany',
            key: 'driverCompany',
            width: 160,
            render: (company: string | null) => company || '-',
        },
        {
            title: t('inquiries.mentions'),
            dataIndex: 'mentionCount',
            key: 'mentionCount',
            width: 100,
            sorter: (a: LoadInquiryDetail, b: LoadInquiryDetail) => a.mentionCount - b.mentionCount,
            defaultSortOrder: 'descend',
            render: (count: number) => (
                <Tag color={count >= 3 ? 'red' : count >= 2 ? 'orange' : 'default'}>
                    {count}x
                </Tag>
            ),
        },
        {
            title: t('inquiries.first_seen'),
            dataIndex: 'firstSeenAt',
            key: 'firstSeenAt',
            width: 120,
            render: (date: string) => formatDate(date),
        },
        {
            title: t('inquiries.last_seen'),
            dataIndex: 'lastSeenAt',
            key: 'lastSeenAt',
            width: 120,
            render: (date: string) => formatDate(date),
        },
    ];

    const vehicleInfo = data[0]?.vehicleInfo;
    const vin = data[0]?.vin;

    return (
        <div>
            <Card
                title={
                    <Space>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            type="text"
                            onClick={() => navigate('/load-inquiries')}
                        />
                        <span style={{ fontWeight: 600, fontSize: 16, fontFamily: 'monospace' }}>
                            {loadId?.toUpperCase()}
                        </span>
                        {vehicleInfo && (
                            <Tag color="blue" style={{ fontSize: 13 }}>
                                {vehicleInfo}
                            </Tag>
                        )}
                        {vin && (
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#888' }}>
                                {vin}
                            </span>
                        )}
                    </Space>
                }
                extra={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchDetail}
                    >
                        {t('common.refresh')}
                    </Button>
                }
            >
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                        <Statistic
                            title={t('inquiries.drivers_interested')}
                            value={driverCount}
                            prefix={<PhoneOutlined />}
                        />
                    </Col>
                    <Col>
                        <Statistic
                            title={t('inquiries.total_mentions_label')}
                            value={data.reduce((sum, d) => sum + d.mentionCount, 0)}
                        />
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    locale={{
                        emptyText: <Empty description={t('inquiries.no_inquiries')} />,
                    }}
                />
            </Card>
        </div>
    );
};
