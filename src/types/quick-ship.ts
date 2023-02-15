export interface QuickForwardRequest {
    order_id: string;
    order_date: string;
    channel_id: string;
    billing_customer_name: string;
    billing_last_name: string;
    billing_address: string;
    billing_city: string;
    billing_pincode: string;
    billing_state: string;
    billing_country: string;
    billing_email: string;
    billing_phone: string;
    shipping_customer_name: string;
    shipping_last_name?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_pincode?: string;
    shipping_state?: string;
    shipping_country?: string;
    shipping_email?: string;
    shipping_phone?: string;
    shipping_is_billing: boolean;
    order_items: OrderItem[];
    payment_method: string;
    sub_total: number;
    length: number;
    breadth: number;
    height: number;
    weight: number;
    pickup_location: string;
    vendor_details: VendorDetails;
}

export interface OrderItem {
    name: string;
    sku: string;
    units: number;
    selling_price: string;
}

export interface VendorDetails {
    email: string;
    phone: number;
    name: string;
    address: string;
    address_2: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
    pickup_location: string;
}

export interface QuickForwardResponse {
    status: number;
    payload: Payload;
}

export interface Payload {
    pickup_location_added: number;
    order_created: number;
    awb_generated: number;
    label_generated: number;
    pickup_generated: number;
    manifest_generated: number;
    pickup_scheduled_date: string;
    pickup_booked_date: any;
    order_id: number;
    shipment_id: number;
    awb_code: string;
    courier_company_id: number;
    courier_name: string;
    assigned_date_time: AssignedDateTime;
    applied_weight: number;
    cod: number;
    label_url: string;
    manifest_url: string;
    routing_code: string;
    rto_routing_code: string;
    pickup_token_number: string;
}

export interface AssignedDateTime {
    date: string;
    timezone_type: number;
    timezone: string;
}
