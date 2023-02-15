export interface ChannelSettings {
    data: ChannelDetails[];
}

export interface ChannelDetails {
    id: number;
    name: string;
    status: string;
    connection_response: any;
    channel_updated_at: string;
    status_code: number;
    settings: Settings;
    auth: any[];
    connection: number;
    orders_sync: number;
    inventory_sync: number;
    catalog_sync: number;
    orders_synced_on: string;
    inventory_synced_on: string;
    base_channel_code: string;
    base_channel: BaseChannel;
    catalog_synced_on: string;
    order_status_mapper: string;
    payment_status_mapper: string;
    brand_name: string;
    brand_logo: string;
}

export interface Settings {
    dimensions: string;
    weight: number;
    order_status: string;
}

export interface BaseChannel {
    id: number;
    name: string;
    code: string;
    type: string;
    logo: string;
    settings_sample: SettingsSample;
    auth_sample: any[];
    description: string;
}

export interface SettingsSample {
    name: string;
    help: string;
    settings: Settings2;
}

export interface Settings2 {
    brand_name: BrandName;
    brand_logo: BrandLogo;
}

export interface BrandName {
    code: string;
    name: string;
    placeholder: string;
    type: string;
}

export interface BrandLogo {
    code: string;
    name: string;
    placeholder: string;
    type: string;
}
