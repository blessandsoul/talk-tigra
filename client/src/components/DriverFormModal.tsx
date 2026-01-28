import { Modal, Form, Input, Button, message, Divider } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

interface DriverFormData {
    phoneNumber: string;
    companyName?: string;
    notes?: string;
    locations?: string[];
}

interface DriverFormModalProps {
    open: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    initialValues?: any; // Driver object if editing
}

export const DriverFormModal = ({ open, onCancel, onSuccess, initialValues }: DriverFormModalProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const isEditMode = !!initialValues;

    useEffect(() => {
        if (open) {
            if (initialValues) {
                // Transform initial values if necessary
                // The server returns locations objects, but we want simple string array for the form
                const formattedValues = {
                    ...initialValues,
                    locations: initialValues.locations?.map((l: any) => l.location?.name || l.name || l) || []
                };
                form.setFieldsValue(formattedValues);
            } else {
                form.resetFields();
            }
        }
    }, [open, initialValues, form]);

    const handleSubmit = async (values: DriverFormData) => {
        try {
            const url = isEditMode
                ? `${API_BASE_URL}/drivers/${initialValues.id}`
                : `${API_BASE_URL}/drivers`;

            const method = isEditMode ? 'PATCH' : 'POST';

            // Ensure locations are just strings
            const payload = {
                ...values,
                locations: values.locations?.filter(l => l && l.trim() !== '') || []
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                message.success(t(isEditMode ? 'common.success' : 'common.success')); // Simplified to common.success or standard msg
                onSuccess();
            } else {
                // If message is present directly use it, otherwise check error object
                const errorMessage = result.error?.message || result.message || 'Operation failed';
                message.error(errorMessage);
            }
        } catch (error) {
            console.error('Error saving driver:', error);
            message.error(t('common.error'));
        }
    };

    return (
        <Modal
            title={<span style={{ fontSize: '20px', fontWeight: 600 }}>{t(isEditMode ? 'drivers.modal.title_edit' : 'drivers.modal.title_create')}</span>}
            open={open}
            onCancel={onCancel}
            width={720}
            footer={null}
            destroyOnClose
            style={{ top: 40 }}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ locations: [''] }}
                requiredMark="optional"
            >
                <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <Form.Item
                            name="phoneNumber"
                            label={t('common.phone')}
                            rules={[{ required: true, message: t('drivers.modal.phone_required') }]}
                            tooltip={t('drivers.modal.phone_tooltip')}
                        >
                            <Input size="large" placeholder="+1234567890" />
                        </Form.Item>

                        <Form.Item
                            name="companyName"
                            label={t('common.company')}
                        // Removed required rule per user request
                        >
                            <Input size="large" placeholder="Acme Transport" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="notes"
                        label={t('common.notes')}
                    >
                        <Input.TextArea size="large" rows={3} placeholder={t('common.notes') + "..."} style={{ resize: 'none' }} />
                    </Form.Item>

                    <Divider style={{ margin: '12px 0 24px 0' }}>{t('drivers.modal.operating_locations')}</Divider>

                    <Form.List
                        name="locations"
                        rules={[
                            {
                                validator: async (_, locations) => {
                                    if (!locations || locations.length < 1) {
                                        return Promise.reject(new Error(t('drivers.modal.location_required')));
                                    }
                                },
                            },
                        ]}
                    >
                        {(fields, { add, remove }) => (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {fields.map((field) => (
                                        <div key={field.key} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <Form.Item
                                                {...field}
                                                validateTrigger={['onChange', 'onBlur']}
                                                rules={[
                                                    {
                                                        required: true,
                                                        whitespace: true,
                                                        message: t('drivers.modal.enter_location'),
                                                    },
                                                ]}
                                                noStyle
                                            >
                                                <Input
                                                    size="large"
                                                    placeholder="City, State"
                                                    style={{ flex: 1 }}
                                                />
                                            </Form.Item>
                                            {fields.length > 0 ? (
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<MinusCircleOutlined />}
                                                    onClick={() => remove(field.name)}
                                                />
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    icon={<PlusOutlined />}
                                    size="large"
                                    style={{ marginTop: '16px', width: '100%' }}
                                >
                                    {t('drivers.modal.add_location')}
                                </Button>
                            </>
                        )}
                    </Form.List>

                    <Divider style={{ margin: '24px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Button size="large" onClick={onCancel}>{t('common.cancel')}</Button>
                        <Button type="primary" size="large" htmlType="submit" style={{ padding: '0 32px' }}>
                            {t(isEditMode ? 'drivers.modal.update_btn' : 'drivers.modal.create_btn')}
                        </Button>
                    </div>
                </div>
            </Form>
        </Modal>
    );
};

