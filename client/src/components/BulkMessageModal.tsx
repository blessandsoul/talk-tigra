import { useState } from 'react';
import { Modal, Form, Input, Button, message, Alert } from 'antd';
import { API_BASE_URL } from '../config';

const { TextArea } = Input;

interface BulkMessageModalProps {
    open: boolean;
    onCancel: () => void;
    selectedNumbers: string[];
    onSuccess: () => void;
}

export const BulkMessageModal = ({ open, onCancel, selectedNumbers, onSuccess }: BulkMessageModalProps) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

            message.success(`${data.data.addedCount} messages queued successfully`);
            form.resetFields();
            onSuccess();
        } catch (err: any) {
            console.error('Queue error:', err);
            setError(err.message || 'An error occurred while queuing messages');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Send Bulk Message"
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    loading={loading}
                    onClick={handleOk}
                    disabled={selectedNumbers.length === 0}
                >
                    Queue Messages
                </Button>,
            ]}
        >
            <Alert
                message={`You are about to send a message to ${selectedNumbers.length} selected driver(s).`}
                description="Messages will be sent at a rate of 1 per 20 seconds."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            {error && (
                <Alert
                    message="Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Form form={form} layout="vertical">
                <Form.Item
                    name="content"
                    label="Message Content"
                    rules={[{ required: true, message: 'Please enter the message content' }]}
                >
                    <TextArea
                        rows={4}
                        placeholder="Enter your message here..."
                        showCount
                        maxLength={1600}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};
