import { useEffect, useState, useCallback } from 'react';
import { Table, Card, Input, message, Button, Empty, Space, Tag } from 'antd';
import type { TableProps } from 'antd';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { BulkMessageModal } from './BulkMessageModal';

interface Pickup {
    id: string;
    vin: string;
    pickupDay: number;
    driverPhone: string | null;
    notes: string | null;
    isOptedOut: boolean;
    syncedAt: string;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    success: boolean;
    message: string;
    data: Pickup[];
}

export const PickupsTable = () => {
    const { t } = useTranslation();
    const [data, setData] = useState<Pickup[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');

    // Selection & bulk message state
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: Pickup) => ({
            disabled: !record.driverPhone || record.isOptedOut,
        }),
    };

    const getSendableNumbers = (): string[] => {
        return (selectedRowKeys as string[])
            .map((id) => {
                const pickup = data.find((d) => d.id === id);
                if (!pickup || !pickup.driverPhone || pickup.isOptedOut) return null;
                return pickup.driverPhone;
            })
            .filter((phone): phone is string => !!phone);
    };

    const handleBulkMessageSuccess = () => {
        setIsModalOpen(false);
        setSelectedRowKeys([]);
    };

    const fetchPickups = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/pickups`);
            const result: ApiResponse = await response.json();

            if (result.success) {
                setData(result.data);
            } else {
                message.error(t('pickups.fetch_error'));
            }
        } catch (error) {
            console.error('Error fetching pickups:', error);
            message.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchPickups();

        // Auto-refresh every 10 minutes
        const interval = setInterval(fetchPickups, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchPickups]);

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/pickups/sync`, {
                method: 'POST',
            });
            const result = await response.json();

            if (result.success) {
                message.success(`Synced ${result.data.synced} pickups`);
                fetchPickups();
            } else {
                message.error(t('common.error'));
            }
        } catch (error) {
            message.error(t('common.error'));
        } finally {
            setSyncing(false);
        }
    };

    const handleNotesChange = async (id: string, newNotes: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/pickups/${id}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: newNotes || null }),
            });

            if (response.ok) {
                message.success(t('pickups.notes_saved'));
                // Update local data without full refetch
                setData((prev) =>
                    prev.map((d) =>
                        d.id === id ? { ...d, notes: newNotes || null } : d
                    )
                );
            } else {
                message.error(t('common.error'));
            }
        } catch (error) {
            message.error(t('common.error'));
        }
        setEditingId(null);
    };

    const columns: TableProps<Pickup>['columns'] = [
        {
            title: t('pickups.vin'),
            dataIndex: 'vin',
            key: 'vin',
            width: 200,
            render: (text: string) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{text}</span>
            ),
            sorter: (a: Pickup, b: Pickup) => a.vin.localeCompare(b.vin),
        },
        {
            title: t('pickups.pickup_day'),
            dataIndex: 'pickupDay',
            key: 'pickupDay',
            width: 100,
            align: 'center',
            render: (day: number) => (
                <span style={{ fontWeight: 600, fontSize: '16px' }}>{day}</span>
            ),
        },
        {
            title: t('pickups.driver_phone'),
            dataIndex: 'driverPhone',
            key: 'driverPhone',
            width: 200,
            render: (text: string | null, record: Pickup) => {
                if (!text) return <span style={{ color: '#ccc' }}>-</span>;
                return (
                    <Space size={4}>
                        <span style={{ fontWeight: 500 }}>{text}</span>
                        {record.isOptedOut && (
                            <Tag color="red" style={{ margin: 0, fontSize: '11px', lineHeight: '18px', padding: '0 4px' }}>
                                /STOP
                            </Tag>
                        )}
                    </Space>
                );
            },
        },
        {
            title: t('common.notes'),
            dataIndex: 'notes',
            key: 'notes',
            render: (text: string | null, record: Pickup) => {
                if (editingId === record.id) {
                    return (
                        <Input.TextArea
                            autoFocus
                            defaultValue={editingValue}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            onBlur={(e) => {
                                const newVal = e.target.value.trim();
                                if (newVal !== (text || '')) {
                                    handleNotesChange(record.id, newVal);
                                } else {
                                    setEditingId(null);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    (e.target as HTMLTextAreaElement).blur();
                                }
                                if (e.key === 'Escape') {
                                    setEditingId(null);
                                }
                            }}
                        />
                    );
                }
                return (
                    <div
                        onClick={() => {
                            setEditingId(record.id);
                            setEditingValue(text || '');
                        }}
                        style={{
                            cursor: 'pointer',
                            minHeight: '22px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px dashed transparent',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = '#d9d9d9';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                        }}
                    >
                        {text || <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>{t('pickups.click_to_add_note')}</span>}
                    </div>
                );
            },
        },
    ];

    return (
        <Card
            bordered={false}
            style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: '24px' }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '16px',
                }}
            >
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                        {t('pickups.title')}
                    </h2>
                    <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
                        {data.length} {t('pickups.vehicles_today')}
                    </span>
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
                        size="large"
                        icon={<ReloadOutlined />}
                        onClick={handleManualSync}
                        loading={syncing}
                    >
                        {t('pickups.sync')}
                    </Button>
                </Space>
            </div>

            <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                scroll={{ x: 700 }}
                pagination={false}
                locale={{
                    emptyText: (
                        <Empty
                            description={t('pickups.no_pickups')}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ),
                }}
            />

            <BulkMessageModal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                selectedNumbers={getSendableNumbers()}
                onSuccess={handleBulkMessageSuccess}
                defaultContent={`Payment Checklist for Order:\n1. At Auction: Get title? -> Send clear photo (Title) BEFORE leaving.\n2. No Title? -> Notify dispatcher with reason BEFORE leaving.\n3. At Warehouse: -> Send clear photo (Title at desk) BEFORE handing it over.\n4. Don't forget to take PU and DEL pictures for BOL.\nFollow these 4 steps to ensure full payment.\nThank you.`}
            />
        </Card>
    );
};
