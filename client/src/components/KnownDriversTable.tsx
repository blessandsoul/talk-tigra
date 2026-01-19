import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Card, Tag, message, Input, Button, Space } from 'antd';
import type { TableProps, PaginationProps } from 'antd';
import { SendOutlined, SearchOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../config';
import { BulkMessageModal } from './BulkMessageModal';

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

    const [inputValue, setInputValue] = useState('');
    const [zipValue, setZipValue] = useState('');

    // Selection state
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Get params from URL or use defaults
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const searchText = searchParams.get('search') || '';
    const zipText = searchParams.get('zip') || '';

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/driver-locations`, window.location.origin);
            url.searchParams.set('page', page.toString());
            url.searchParams.set('limit', limit.toString());

            // CRITICAL FIX: Send search query to server for server-side filtering
            if (searchText) {
                url.searchParams.set('location', searchText);
            }
            if (zipText) {
                url.searchParams.set('state', zipText); // Use dedicated state filter for precise state matching
            }

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
        // Clear existing data immediately when search params change
        // This prevents showing stale results from previous searches
        setData([]);
        fetchDrivers();
    }, [page, limit, searchText, zipText]);

    // REMOVED: Client-side filtering - now done on server
    // const filteredData = data.filter(...);


    const handleTableChange: PaginationProps['onChange'] = (newPage, newPageSize) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        params.set('limit', newPageSize?.toString() || '20');
        if (searchText) params.set('search', searchText);
        if (zipText) params.set('zip', zipText);
        setSearchParams(params);
    };

    useEffect(() => {
        setInputValue(searchText);
        setZipValue(zipText);
    }, [searchText, zipText]);

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams);
        if (inputValue) {
            params.set('search', inputValue);
        } else {
            params.delete('search');
        }
        params.delete('zip'); // Clear zip when searching generic
        setZipValue(''); // specific UX choice: clear other input
        params.set('page', '1');
        setSearchParams(params);
    };

    const handleZipSearch = () => {
        const params = new URLSearchParams(searchParams);
        if (zipValue) {
            params.set('zip', zipValue);
        } else {
            params.delete('zip');
        }
        params.delete('search'); // Clear search when searching zip
        setInputValue(''); // specific UX choice: clear other input
        params.set('page', '1');
        setSearchParams(params);
    };

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    const handleBulkMessageSuccess = () => {
        setIsModalOpen(false);
        setSelectedRowKeys([]); // Clear selection after queuing
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Input
                            placeholder="Search location/number..."
                            value={inputValue}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setInputValue(newValue);
                                if (newValue === '') {
                                    const params = new URLSearchParams(searchParams);
                                    params.delete('search');
                                    params.set('page', '1');
                                    setSearchParams(params);
                                }
                            }}
                            onPressEnter={handleSearch}
                            style={{ width: 250 }}
                            allowClear
                        />
                        <Button icon={<SearchOutlined />} onClick={handleSearch}>
                            Search
                        </Button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Input
                            placeholder="Search Zip..."
                            value={zipValue}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setZipValue(newValue);
                                if (newValue === '') {
                                    const params = new URLSearchParams(searchParams);
                                    params.delete('zip');
                                    params.set('page', '1');
                                    setSearchParams(params);
                                }
                            }}
                            onPressEnter={handleZipSearch}
                            style={{ width: 150 }}
                            allowClear
                        />
                        <Button icon={<SearchOutlined />} onClick={handleZipSearch}>
                            Zip
                        </Button>
                    </div>
                    <Space>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => setIsModalOpen(true)}
                            disabled={selectedRowKeys.length === 0}
                        >
                            Send Message ({selectedRowKeys.length})
                        </Button>
                        <Tag color="success">{pagination.total} Total</Tag>
                    </Space>
                </div>
            }
        >
            <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={data} // Changed from filteredData to data (server-side filtering)
                rowKey="number" // Use phone number as unique key
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

            <BulkMessageModal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                selectedNumbers={selectedRowKeys as string[]}
                onSuccess={handleBulkMessageSuccess}
            />
        </Card>
    );
};
