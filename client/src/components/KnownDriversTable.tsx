import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Card, Tag, message, Input } from 'antd';
import type { TableProps, PaginationProps } from 'antd';
import { API_BASE_URL } from '../config';

// Interface matching the server response for DriverLocation
interface DriverLocation {
    number: string;
    location: string;
    lastSeenAt: string;
    createdAt: string;
    updatedAt: string;
}

interface PaginatedApiResponse {
    success: true;
    message: string;
    data: {
        items: DriverLocation[];
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

export const KnownDriversTable = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<DriverLocation[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });

    // Get params from URL or use defaults
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchText = searchParams.get('search') || '';

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/driver-locations`, window.location.origin);
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
                message.error('Failed to fetch known drivers');
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            message.error('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, [page, limit]);

    // Client-side filtering for search
    const filteredData = data.filter(item => {
        const searchLower = searchText.toLowerCase();
        return (
            item.number.toLowerCase().includes(searchLower) ||
            item.location.toLowerCase().includes(searchLower)
        );
    });

    const handleTableChange: PaginationProps['onChange'] = (newPage, newPageSize) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        params.set('limit', newPageSize?.toString() || '20');
        if (searchText) params.set('search', searchText);
        setSearchParams(params);
    };

    const handleSearchChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set('search', value);
        } else {
            params.delete('search');
        }
        params.set('page', '1'); // Reset to page 1 on search
        setSearchParams(params);
    };

    const columns: TableProps<DriverLocation>['columns'] = [
        {
            title: 'Number',
            dataIndex: 'number',
            key: 'number',
            sorter: (a, b) => a.number.localeCompare(b.number),
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
            render: (text) => <Tag color="blue">{text}</Tag>,
            sorter: (a, b) => a.location.localeCompare(b.location),
        },
        {
            title: 'Last Seen',
            dataIndex: 'lastSeenAt',
            key: 'lastSeenAt',
            render: (date) => new Date(date).toLocaleString(),
            sorter: (a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime(),
            defaultSortOrder: 'descend',
        },
    ];

    return (
        <Card
            title="Known Drivers (Active Locations)"
            extra={
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <Input
                        placeholder="Search number or location..."
                        value={searchText}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        style={{ width: 300 }}
                        allowClear
                    />
                    <Tag color="success">{pagination.total} Total</Tag>
                </div>
            }
        >
            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey={(record) => `${record.number}-${record.location}`}
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
