import { FulfillmentItem } from "@medusajs/medusa";

export interface ShipRocketStatus {
    awb: string;
    courier_name: string;
    current_status: string;
    current_status_id: number;
    shipment_status: string;
    shipment_status_id: number;
    current_timestamp: string;
    order_id: string;
    sr_order_id: number;
    etd: string;
    scans?: ScansEntity[] | null;
    is_return: number;
    channel_id: number;
}
export interface ScansEntity {
    "location": string;
    "date": string;
    "activity": string;
    "status": string;
    "sr-status": string | number;
    "sr-status-label": string;
}

export interface CourierServiceAbilityResponse {
    company_auto_shipment_insurance_setting: boolean;
    covid_zones: CovidZones;
    currency: string;
    data: CourierData;
    dg_courier: number;
    eligible_for_insurance: number;
    insurace_opted_at_order_creation: boolean;
    is_allow_templatized_pricing: boolean;
    is_latlong: number;
    label_generate_type: number;
    seller_address: any[];
    status: number;
    user_insurance_manadatory: boolean;
}

export interface CovidZones {
    delivery_zone: any;
    pickup_zone: any;
}

export interface CourierData {
    available_courier_companies: AvailableCourierCompany[];
    child_courier_id: any;
    is_recommendation_enabled: number;
    recommended_by: RecommendedBy;
    recommended_courier_company_id: number;
    shiprocket_recommended_courier_id: number;
}

export interface AvailableCourierCompany {
    air_max_weight: string;
    base_courier_id: any;
    base_weight: string;
    blocked: number;
    call_before_delivery: string;
    charge_weight: number;
    city: string;
    cod: number;
    cod_charges: number;
    cod_multiplier: number;
    cost: string;
    courier_company_id: number;
    courier_name: string;
    courier_type: string;
    coverage_charges: number;
    cutoff_time: string;
    delivery_boy_contact: string;
    delivery_performance: number;
    description: string;
    edd: string;
    entry_tax: number;
    estimated_delivery_days: string;
    etd: string;
    etd_hours: number;
    freight_charge: number;
    id: number;
    is_custom_rate: number;
    is_hyperlocal: boolean;
    is_international: number;
    is_rto_address_available: boolean;
    is_surface: boolean;
    local_region: number;
    metro: number;
    min_weight: number;
    mode: number;
    odablock: boolean;
    other_charges: number;
    others: any;
    pickup_availability: number;
    pickup_performance: number;
    pickup_priority: string;
    pickup_supress_hours: number;
    pod_available: string;
    postcode: string;
    qc_courier: number;
    rank: string;
    rate: number;
    rating: number;
    realtime_tracking: string;
    region: number;
    rto_charges: number;
    rto_performance: number;
    seconds_left_for_pickup: number;
    state: string;
    suppress_date: string;
    suppress_text: string;
    suppression_dates: any;
    surface_max_weight: string;
    tracking_performance: number;
    volumetric_max_weight?: number;
    weight_cases: number;
}

export interface RecommendedBy {
    id: number;
    title: string;
}

export interface InternationalCourierServiceabilityResponse {
    status: number;
    data: InternationCourierData;
}

export interface InternationCourierData {
    is_recommendation_enabled: boolean;
    recommended_courier_company_id: number;
    recommended_by: RecommendedBy;
    available_courier_companies: AvailableCourierCompanyIntl[];
}

export interface RecommendedBy {
    id: number;
    title: string;
}

export interface AvailableCourierCompanyIntl {
    courier_company_id: number;
    courier_name: string;
    rate: Rate;
}

export interface Rate {
    rate: string;
    weight: string;
}

export type Address = {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    address: string;
    address_2?: string;
};

export type priceInfo = {
    discount?: number;
    sub_total: number;
    total_discount?: number;
    shipping_charges: number;
    giftwrap_charges?: number;
    transaction_charges?: number;
};
export type dimensions = {
    length: number;
    breadth: number;
    height: number;
    weight: number;
};

export type OrderItem = {
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount?: number;
    tax?: number;
    hsn?: number;
};

export interface CreateOrderRequestOptions {
    channel_id: number;
    order_id: string;
    order_date: string;
    pickup_location: string;
    comment?: string;
    billing_address: Address;
    shipping_address?: Address;
    shipping_is_billing?: boolean;
    order_items: OrderItem[];
    priceInfo: priceInfo;
    payment_method: "Prepaid" | "COD";
    packageInfo: dimensions;
}

export interface CreateOrderResponse {
    order_id: number;
    shipment_id: number;
    status: string;
    status_code: number;
    onboarding_completed_now: number;
    awb_code: string | null;
    courier_company_id: number | null;
    courier_name: string | null;
}

export interface ProductOptions {
    name: string;
    category_code: "default" | string;
    hsn?: string;
    type: "single" | "multiple";
    sku: string;
    quantity: number;
    description?: string;
    brand?: string;
    size?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    ean?: string;
    upc?: string;
    color?: string;
    imei_serialnumber?: string;
    cost_price?: number;
    mrp?: number;
    status?: boolean;
    image_ur?: string;
}
export interface ServiceabilityOptions {
    pickup_pincode: string;
    delivery_pincode: string;
    cod: boolean;
    orderId?: string;
    price?: number;
    weight: number;
    height: number;
    breadth?: number;
    length?: number;
    mode: "Surface" | "Air";
    is_return?: boolean;
}

export interface InternationalServiceabilityOptions {
    pickup_postcode: string;
    delivery_country: string;
    currency: string;
    cod: boolean;
    orderId?: string;
    price?: number;
    weight: number;
}

export type awb_number = string | number;

export interface CreatePickupLocationRequest {
    pickup_location: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    address_2: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
}

export interface CreatePickupLocationResponse {
    success: boolean;
    address: PickupLocationAddress;
    pickup_id: number;
    company_name: string;
    full_name: string;
}

export interface PickupLocationAddress {
    company_id: number;
    pickup_code: string;
    address: string;
    address_2: string;
    address_type: string;
    city: string;
    state: string;
    country: string;
    gstin: string;
    pin_code: string;
    phone: string;
    email: string;
    name: string;
    alternate_phone: string;
    lat: string;
    long: string;
    status: number;
    phone_verified: number;
    rto_address_id: number;
    extra_info: string;
    updated_at: string;
    created_at: string;
    id: number;
}

export interface CreateReturnRequestOptions {
    order_id: string;
    order_date: string;
    channel_id: string;
    pickup_customer_name: string;
    pickup_last_name: string;
    company_name: string;
    pickup_address: string;
    pickup_address_2: string;
    pickup_city: string;
    pickup_state: string;
    pickup_country: string;
    pickup_pincode: string | number;
    pickup_email: string;
    pickup_phone: string;
    pickup_isd_code: string;
    shipping_customer_name: string;
    shipping_last_name: string;
    shipping_address: string;
    shipping_address_2: string;
    shipping_city: string;
    shipping_country: string;
    shipping_pincode: string | number;
    shipping_state: string;
    shipping_email: string;
    shipping_isd_code: string;
    shipping_phone: number;
    order_items: OrderReturnItem[];
    payment_method: string;
    total_discount: string;
    sub_total: number;
    length: number;
    breadth: number;
    height: number;
    weight: number;
}

export interface OrderReturnItem {
    sku: string;
    name: string;
    units: number;
    selling_price: number;
    discount: number;
    qc_enable: boolean;
    hsn: string;
    brand: string;
    qc_size: string;
}

export interface PickupAddressesResponse {
    data: PickupAddressDetails;
}

export interface PickupAddressDetails {
    shipping_address: ShippingAddress[];
    allow_more: string;
}

export interface ShippingAddress {
    id: number;
    pickup_location: string;
    address: string;
    address_2: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
    email: string;
    phone: string;
    name: string;
    company_id: number;
    status: number;
    phone_verified: number;
}

export interface CreatePickupLocationRequest {
    pickup_location: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    address_2: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
}

export interface AssignAwbResponse {
    awb_assign_status: number;
    response: AwbResponse;
}

export interface AwbResponse {
    data: AwbResponseData;
}

export interface AwbResponseData {
    courier_company_id: number;
    awb_code: string;
    cod: number;
    order_id: number;
    shipment_id: number;
    awb_code_status: number;
    assigned_date_time: AssignedDateTime;
    applied_weight: number;
    company_id: number;
    courier_name: string;
    child_courier_name: any;
    pickup_scheduled_date: string;
    routing_code: string;
    rto_routing_code: string;
    invoice_no: string;
    transporter_id: string;
    transporter_name: string;
    shipped_by: ShippedBy;
}

export interface AssignedDateTime {
    date: string;
    timezone_type: number;
    timezone: string;
}

export interface ShippedBy {
    shipper_company_name: string;
    shipper_address_1: string;
    shipper_address_2: string;
    shipper_city: string;
    shipper_state: string;
    shipper_country: string;
    shipper_postcode: string;
    shipper_first_mile_activated: number;
    shipper_phone: string;
    lat: string;
    long: string;
    shipper_email: string;
    rto_company_name: string;
    rto_address_1: string;
    rto_address_2: string;
    rto_city: string;
    rto_state: string;
    rto_country: string;
    rto_postcode: string;
    rto_phone: string;
    rto_email: string;
}

export interface PickupResponse {
    pickup_status: number;
    response: PickupEntityResponse;
}

export interface PickupEntityResponse {
    pickup_scheduled_date: string;
    pickup_token_number: string;
    status: number;
    others: string;
    pickup_generated_date: PickupGeneratedDate;
    data: string;
}

export interface PickupGeneratedDate {
    date: string;
    timezone_type: number;
    timezone: string;
}
