import { useEffect, useState, useCallback } from 'react';
import { Table, Card, Input, message, Button, Space, Tag, Statistic, Row, Col, Empty } from 'antd';
import type { TableProps } from 'antd';
import { ReloadOutlined, SearchOutlined, CarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useDebounce } from '../hooks/useDebounce';

interface LoadInquiryStatsItem {
    loadId: string;
    vin: string | null;
    vehicleInfo: string | null;
    receivedIn: string | null;
    driverCount: number;
    totalMentions: number;
    latestInquiry: string;
}

interface PaginatedStatsResponse {
    success: boolean;
    message: string;
    data: {
        items: LoadInquiryStatsItem[];
        pagination: {
            page: number;
            limit: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    };
}

export const LoadInquiriesPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [statsData, setStatsData] = useState<LoadInquiryStatsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchText, setSearchText] = useState('');
    const debouncedSearch = useDebounce(searchText, 500);

    const fetchStats = useCallback(async (page = 1, limit = 20) => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/load-inquiries/stats`, window.location.origin);
            url.searchParams.set('page', page.toString());
            url.searchParams.set('limit', limit.toString());

            const response = await fetch(url.toString());
            const result: PaginatedStatsResponse = await response.json();

            if (result.success) {
                setStatsData(result.data.items);
                setPagination({
                    current: result.data.pagination.page,
                    pageSize: result.data.pagination.limit,
                    total: result.data.pagination.totalItems,
                });
            } else {
                message.error(t('inquiries.fetch_error'));
            }
        } catch {
            message.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchStats(1, pagination.pageSize);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // When search text looks like a load ID, navigate to detail page
    useEffect(() => {
        if (!debouncedSearch) return;
        const query = debouncedSearch.trim().toUpperCase();
        if (query.length >= 4 && query.length <= 6 && /^[A-Z0-9]+$/.test(query)) {
            navigate(`/load-inquiries/${query}`);
            setSearchText('');
        }
    }, [debouncedSearch, navigate]);

    const formatDate = (date: string): string => {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    };

    const columns: TableProps<LoadInquiryStatsItem>['columns'] = [
        {
            title: t('inquiries.load_id'),
            dataIndex: 'loadId',
            key: 'loadId',
            width: 110,
            render: (loadId: string) => (
                <Button
                    type="link"
                    style={{ padding: 0, fontWeight: 600, fontFamily: 'monospace' }}
                    onClick={() => navigate(`/load-inquiries/${loadId}`)}
                >
                    {loadId}
                </Button>
            ),
        },
        {
            title: t('inquiries.vehicle'),
            dataIndex: 'vehicleInfo',
            key: 'vehicleInfo',
            width: 200,
            ellipsis: true,
            render: (info: string | null) => info || '-',
        },
        {
            title: 'VIN',
            dataIndex: 'vin',
            key: 'vin',
            width: 180,
            render: (vin: string | null) => (
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {vin || '-'}
                </span>
            ),
        },
        {
            title: t('inquiries.drivers'),
            dataIndex: 'driverCount',
            key: 'driverCount',
            width: 110,
            sorter: (a: LoadInquiryStatsItem, b: LoadInquiryStatsItem) => a.driverCount - b.driverCount,
            defaultSortOrder: 'descend',
            render: (count: number) => (
                <Tag color={count >= 3 ? 'red' : count >= 2 ? 'orange' : 'default'}>
                    {count} {count === 1 ? 'driver' : 'drivers'}
                </Tag>
            ),
        },
        {
            title: t('inquiries.mentions'),
            dataIndex: 'totalMentions',
            key: 'totalMentions',
            width: 100,
            render: (count: number) => count,
        },
        {
            title: t('inquiries.latest'),
            dataIndex: 'latestInquiry',
            key: 'latestInquiry',
            width: 120,
            render: (date: string) => formatDate(date),
        },
    ];

    return (
        <div>
            <Card
                title={
                    <Space>
                        <CarOutlined />
                        <span>{t('inquiries.title')}</span>
                    </Space>
                }
                extra={
                    <Space>
                        <Input
                            placeholder={t('inquiries.search_placeholder')}
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                            style={{ width: 280 }}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchStats(pagination.current, pagination.pageSize)}
                        >
                            {t('common.refresh')}
                        </Button>
                    </Space>
                }
            >
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                        <Statistic
                            title={t('inquiries.total_loads')}
                            value={pagination.total}
                            prefix={<CarOutlined />}
                        />
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={statsData}
                    rowKey="loadId"
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        onChange: (page, pageSize) => {
                            fetchStats(page, pageSize);
                        },
                    }}
                    locale={{
                        emptyText: <Empty description={t('inquiries.no_data')} />,
                    }}
                />
            </Card>
        </div>
    );
};
