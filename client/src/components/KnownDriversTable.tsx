import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Card, Tag, message, Input, Button, Space, Popconfirm } from 'antd';
import type { TableProps, PaginationProps } from 'antd';
import { SendOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { BulkMessageModal } from './BulkMessageModal';
import { DriverFormModal } from './DriverFormModal';
import { useDebounce } from '../hooks/useDebounce';

// Interface matching the server response for Driver with grouped locations
interface DriverLocation {
    name: string;
    auctionName: string | null;
    auctionType: 'COPART' | 'IAAI' | null;
    lastSeenAt: string;
}

interface Driver {
    id: string;
    number: string;
    name: string | null;
    driverNumber: string | null;
    companyName: string | null;
    notes: string | null;
    locations: DriverLocation[];
    lastSeenAt: string;
    createdAt: string;
    updatedAt: string;
}

interface PaginatedApiResponse {
    success: true;
    message: string;
    data: {
        items: Driver[];
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
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });

    const [inputValue, setInputValue] = useState(searchParams.get('search') || '');
    const [zipValue, setZipValue] = useState(searchParams.get('zip') || '');

    const debouncedSearch = useDebounce(inputValue, 500);
    const debouncedZip = useDebounce(zipValue, 500);

    // Selection state
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/drivers/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                message.success(t('drivers.delete_success'));
                fetchDrivers();
            } else {
                message.error(t('common.error'));
            }
        } catch (error) {
            message.error(t('common.error'));
        }
    };

    const handleEdit = (driver: Driver) => {
        const formData = {
            id: driver.id,
            phoneNumber: driver.number,
            name: driver.name,
            driverNumber: driver.driverNumber,
            companyName: driver.companyName,
            notes: driver.notes,
            locations: driver.locations.map(loc => loc.auctionName || loc.name),
        };
        setEditingDriver(formData as unknown as Driver);
        setIsCreateModalOpen(true);
    };

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

            if (searchText) {
                // Smart search: if input looks like a phone number (digits/plus), search by phone
                // otherwise search by location
                const isPhoneSearch = /^[\d+()-]{3,}$/.test(searchText);
                if (isPhoneSearch) {
                    url.searchParams.set('phoneNumber', searchText);
                } else {
                    url.searchParams.set('location', searchText);
                }
            }
            if (zipText) {
                url.searchParams.set('state', zipText);
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
                message.error(t('drivers.fetch_error'));
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            message.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setData([]);
        fetchDrivers();
    }, [page, limit, searchText, zipText]);

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

    useEffect(() => {
        applyFilters(debouncedSearch, debouncedZip);
    }, [debouncedSearch, debouncedZip]);

    const applyFilters = (newSearch?: string, newZip?: string) => {
        const params = new URLSearchParams(searchParams);

        // Use provided values or fall back to current state if undefined
        // We need to be careful: if the argument is null/empty string, we should use that
        // If the argument is undefined, we use the current state value

        const finalSearch = newSearch !== undefined ? newSearch : inputValue;
        const finalZip = newZip !== undefined ? newZip : zipValue;

        if (finalSearch) {
            params.set('search', finalSearch);
        } else {
            params.delete('search');
        }

        if (finalZip) {
            params.set('zip', finalZip);
        } else {
            params.delete('zip');
        }

        params.set('page', '1');
        setSearchParams(params);
    };

    const handleSearch = () => {
        applyFilters(inputValue, zipValue);
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
        setSelectedRowKeys([]);
    };

    // Filter out drivers whose notes field is "x" (opt-out) from message sending
    const getSendableNumbers = (): string[] => {
        return (selectedRowKeys as string[]).filter((phoneNumber) => {
            const driver = data.find((d) => d.number === phoneNumber);
            return !(driver?.notes?.trim().toLowerCase() === 'x');
        });
    };

    const handleCreateDriverSuccess = () => {
        setIsCreateModalOpen(false);
        fetchDrivers();
    };

    const columns: TableProps<Driver>['columns'] = [
        {
            title: t('common.phone'),
            dataIndex: 'number',
            key: 'number',
            width: 150,
            render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
            sorter: (a, b) => a.number.localeCompare(b.number),
        },
        {
            title: t('common.company'),
            dataIndex: 'companyName',
            key: 'companyName',
            width: 180,
            render: (text) => text ? <span style={{ fontWeight: 500, color: '#1677ff' }}>{text}</span> : <span style={{ color: '#ccc' }}>-</span>,
            sorter: (a, b) => (a.companyName || '').localeCompare(b.companyName || ''),
        },
        {
            title: t('common.locations'),
            dataIndex: 'locations',
            key: 'locations',
            width: '30%',
            render: (locations: Driver['locations']) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {locations.map((loc, index) => {
                        const displayName = loc.auctionName || loc.name;
                        let color = 'default';
                        if (loc.auctionType === 'COPART') color = 'blue';
                        if (loc.auctionType === 'IAAI') color = 'red';

                        return (
                            <Tag
                                key={index}
                                color={color}
                                style={{ borderRadius: '4px', border: 'none', padding: '0 6px', fontSize: '12px', lineHeight: '20px' }}
                            >
                                {displayName}
                            </Tag>
                        );
                    })}
                    {locations.length === 0 && <span style={{ color: '#ccc' }}>-</span>}
                </div>
            ),
        },
        {
            title: t('common.notes'),
            dataIndex: 'notes',
            key: 'notes',
            width: '30%',
            ellipsis: true,
            render: (text) => text || <span style={{ color: '#ccc' }}>-</span>,
        },
        {
            title: t('common.actions'),
            key: 'actions',
            width: 110,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        style={{ color: '#1677ff' }}
                    />
                    <Popconfirm
                        title={t('drivers.delete_confirm_title')}
                        description={t('drivers.delete_confirm_desc')}
                        onConfirm={() => handleDelete(record.id)}
                        okText={t('common.yes')}
                        cancelText={t('common.no')}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card
            bordered={false}
            style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: '24px' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Input
                            size="large"
                            placeholder={t('drivers.search_placeholder_combined', 'Search by location or phone...')}
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onPressEnter={handleSearch}
                            style={{ width: 320 }}
                            allowClear
                        />
                        <Button size="large" onClick={handleSearch} icon={<SearchOutlined />}>
                            {t('common.search')}
                        </Button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Input
                            size="large"
                            placeholder={t('drivers.state_placeholder')}
                            value={zipValue}
                            onChange={(e) => setZipValue(e.target.value)}
                            onPressEnter={handleSearch}
                            style={{ width: 100 }}
                            allowClear
                        />
                        <Button size="large" onClick={handleSearch}>
                            {t('drivers.filter_state')}
                        </Button>
                    </div>
                </div>

                <Space size="middle">
                    {selectedRowKeys.length > 0 && getSendableNumbers().length > 0 && (
                        <Button
                            size="large"
                            icon={<SendOutlined />}
                            onClick={() => setIsModalOpen(true)}
                        >
                            {t('drivers.message_selected')} ({getSendableNumbers().length})
                        </Button>
                    )}
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingDriver(null);
                            setIsCreateModalOpen(true);
                        }}
                        style={{ padding: '0 24px', fontWeight: 500 }}
                    >
                        {t('drivers.add_new')}
                    </Button>
                </Space>
            </div>

            <Table
                onRow={(record) => ({
                    onDoubleClick: () => handleEdit(record),
                    style: { cursor: 'pointer' }
                })}
                rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                rowKey="number"
                loading={loading}
                scroll={{ x: 1000 }}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: handleTableChange,
                    onShowSizeChange: handleTableChange,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} drivers`,
                    style: { marginTop: '24px', marginBottom: 0 }
                }}
            />

            <BulkMessageModal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                selectedNumbers={getSendableNumbers()}
                onSuccess={handleBulkMessageSuccess}
            />

            <DriverFormModal
                open={isCreateModalOpen}
                onCancel={() => {
                    setIsCreateModalOpen(false);
                    setEditingDriver(null);
                }}
                onSuccess={handleCreateDriverSuccess}
                initialValues={editingDriver}
            />
        </Card>
    );
};
