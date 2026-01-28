import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const handleChange = (value: string) => {
        i18n.changeLanguage(value);
    };

    return (
        <Segmented
            options={[
                { label: 'EN', value: 'en' },
                { label: 'GE', value: 'ka' },
            ]}
            value={i18n.language === 'ge' ? 'ka' : i18n.language} // Handle 'ge' alias if any, but sticking to 'ka'
            onChange={handleChange}
            style={{ marginLeft: 16 }}
        />
    );
};
