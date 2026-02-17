import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

const { TextArea } = Input;

interface BulkMessageModalProps {
    open: boolean;
    onCancel: () => void;
    selectedNumbers: string[];
    onSuccess: () => void;
    defaultContent?: string;
}

export const BulkMessageModal = ({ open, onCancel, selectedNumbers, onSuccess, defaultContent }: BulkMessageModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && defaultContent) {
            form.setFieldsValue({ content: defaultContent });
        }
    }, [open, defaultContent, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/messages/queue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumbers: selectedNumbers,
                    content: values.content,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to queue messages');
            }

            message.success(t('common.success')); // Simplified
            form.resetFields();
            onSuccess();
        } catch (err: any) {
            console.error('Queue error:', err);
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={t('bulk_message.title')}
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    {t('common.cancel')}
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    loading={loading}
                    onClick={handleOk}
                    disabled={selectedNumbers.length === 0}
                >
                    {t('bulk_message.queue_btn')}
                </Button>,
            ]}
        >
            <Alert
                message={t('bulk_message.info', { count: selectedNumbers.length })}
                description={t('bulk_message.rate_info')}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            {error && (
                <Alert
                    message={t('common.error')}
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Form form={form} layout="vertical">
                <Form.Item
                    name="content"
                    label={t('bulk_message.content_label')}
                    rules={[{ required: true, message: t('bulk_message.content_required') }]}
                >
                    <TextArea
                        rows={4}
                        placeholder={t('bulk_message.content_placeholder')}
                        showCount
                        maxLength={1600}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};
