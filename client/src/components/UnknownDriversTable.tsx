import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Card, Tag, message, Button } from 'antd';
import type { TableProps, PaginationProps } from 'antd';
import { API_BASE_URL } from '../config';

// Interface matching the server response for UnknownDriver
interface UnknownDriver {
    id: string;
    phoneNumber: string;
    loadIds: string[];
    rawLocation?: string;
    createdAt: string;
}

interface PaginatedApiResponse {
    success: true;
    message: string;
    data: {
        items: UnknownDriver[];
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

export const UnknownDriversTable = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<UnknownDriver[]>([]);
    const [loading, setLoading] = useState(false);
    const [matching, setMatching] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });

    // Get params from URL or use defaults
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const fetchUnknownDrivers = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/unknown-drivers/unmatched`, window.location.origin);
            url.searchParams.set('page', page.toString());
            url.searchParams.set('limit', limit.toString());

            const response = await fetch(url.toString());
            const result: PaginatedApiResponse = await response.json();

            if (result.success) {
                setData(result.data.items);
                setPagination({
                    current: result.data.pagination.page,
                    pageSize: result.data.pagination.limit,
                    total: result.data.pagination.totalItems,
                });
            } else {
                message.error('Failed to fetch unknown drivers');
            }
        } catch (error) {
            console.error('Error fetching unknown drivers:', error);
            message.error('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const handleMatch = async () => {
        setMatching(true);
        try {
            const response = await fetch(`${API_BASE_URL}/unknown-drivers/match`, {
                method: 'POST'
            });
            const result = await response.json();
            if (result.success) {
                message.success(`Matched ${result.data.matchedCount} drivers!`);
                fetchUnknownDrivers(); // Refresh list
            } else {
                message.error('Matching failed');
            }
        } catch (error) {
            console.error('Error matching drivers:', error);
            message.error('Error connecting to server');
        } finally {
            setMatching(false);
        }
    };

    useEffect(() => {
        fetchUnknownDrivers();
    }, [page, limit]);

    const handleTableChange: PaginationProps['onChange'] = (newPage, newPageSize) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        params.set('limit', newPageSize?.toString() || '20');
        setSearchParams(params);
    };

    const columns: TableProps<UnknownDriver>['columns'] = [
        {
            title: 'Phone Number',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
        },
        {
            title: 'Load IDs',
            dataIndex: 'loadIds',
            key: 'loadIds',
            render: (loadIds: string[]) => (
                <>
                    {loadIds.map(id => (
                        <Tag key={id}>{id}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Raw Location (AI Extracted)',
            dataIndex: 'rawLocation',
            key: 'rawLocation',
            render: (text) => text ? <Tag color="orange">{text}</Tag> : <span style={{ color: '#ccc' }}>Not extracted</span>,
        },
        {
            title: 'Seen At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleString(),
        },
    ];

    return (
        <Card
            title="Unknown Drivers (Unmatched)"
            extra={
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Tag color="warning">{pagination.total} Pending</Tag>
                    <Button type="primary" onClick={handleMatch} loading={matching}>
                        Run Matching
                    </Button>
                </div>
            }
        >
            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: handleTableChange,
                    onShowSizeChange: handleTableChange,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                }}
            />
        </Card>
    );
};
