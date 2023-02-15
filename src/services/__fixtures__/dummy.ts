import { IdMap } from "medusa-test-utils";

export const testData = {
    awb: "SF218221231KR",
    courier_name: "Shadowfax Surface",
    current_status: "RTO INITIATED",
    current_status_id: 15,
    shipment_status: "RTO INITIATED",
    shipment_status_id: 9,
    current_timestamp: "23 05 2022 17:24:14",
    order_id: "90704",
    sr_order_id: 216544188,
    etd: "2022-05-22 11:17:30",
    scans: [
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-16 16:18:47",
            "activity": "Item New at JAI_22Godam_FM",
            "status": "new",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-17 09:59:03",
            "activity": "Item assigned for seller pickup at JAI_22Godam_FM",
            "status": "assigned_for_seller_pickup",
            "sr-status": 19,
            "sr-status-label": "OUT FOR PICKUP"
        },
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-17 09:59:27",
            "activity": "Item Out For Pickup at JAI_22Godam_FM",
            "status": "ofp",
            "sr-status": 19,
            "sr-status-label": "OUT FOR PICKUP"
        },
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-17 13:41:25",
            "activity": "Picked Successfully",
            "status": "picked",
            "sr-status": 42,
            "sr-status-label": "PICKED UP"
        },
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-17 16:17:30",
            "activity": "Received at hub Successfully",
            "status": "recd_at_rev_hub",
            "sr-status": 6,
            "sr-status-label": "SHIPPED"
        },
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-17 16:17:30",
            "activity": "Item Received at pickup hub at JAI_22Godam_FM",
            "status": "recd_at_fwd_hub",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-17 18:00:24",
            "activity": "Item added to bag at JAI_22Godam_FM",
            "status": "item_manifested",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "JAI_22Godam_FM",
            "date": "2022-05-17 18:17:14",
            "activity": "Bag in transit from JAI_22Godam_FM",
            "status": "bag_in_transit",
            "sr-status": 18,
            "sr-status-label": "IN TRANSIT"
        },
        {
            "location": "Jaipur DC",
            "date": "2022-05-17 20:10:38",
            "activity": "Bag received at Jaipur DC",
            "status": "bag_received",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "Jaipur DC",
            "date": "2022-05-17 21:37:49",
            "activity": "Item Received at dc at Jaipur DC",
            "status": "recd_at_fwd_dc",
            "sr-status": 18,
            "sr-status-label": "IN TRANSIT"
        },
        {
            "location": "Jaipur DC",
            "date": "2022-05-17 21:37:50",
            "activity": "Item Received at dc at Jaipur DC",
            "status": "recd_at_fwd_dc",
            "sr-status": 18,
            "sr-status-label": "IN TRANSIT"
        },
        {
            "location": "Jaipur DC",
            "date": "2022-05-18 02:35:06",
            "activity": "Item added to bag at Jaipur DC",
            "status": "item_manifested",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "Jaipur DC",
            "date": "2022-05-18 07:54:59",
            "activity": "Bag in transit from Jaipur DC",
            "status": "bag_in_transit",
            "sr-status": 18,
            "sr-status-label": "IN TRANSIT"
        },
        {
            "location": "Bangalore DC",
            "date": "2022-05-20 22:59:44",
            "activity": "Bag received at via Bangalore DC",
            "status": "bag_received_at_via",
            "sr-status": 18,
            "sr-status-label": "IN TRANSIT"
        },
        {
            "location": "Bangalore DC",
            "date": "2022-05-21 02:12:35",
            "activity": "Bag in transit from Bangalore DC",
            "status": "bag_in_transit",
            "sr-status": 18,
            "sr-status-label": "IN TRANSIT"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-21 04:38:19",
            "activity": "Bag received at BLR_BSK",
            "status": "bag_received",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-21 05:56:40",
            "activity": "Item Received at hub at BLR_BSK",
            "status": "recd_at_fwd_hub",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-21 09:17:36",
            "activity": "Item Assigned at BLR_BSK",
            "status": "assigned_for_delivery",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-21 09:17:47",
            "activity": "Item OFD at BLR_BSK",
            "status": "ofd",
            "sr-status": 17,
            "sr-status-label": "OUT FOR DELIVERY"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-21 17:02:02",
            "activity": "Cancelled by customer",
            "status": "cancelled_by_customer",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-23 03:00:30",
            "activity": "Item Return To Seller at BLR_BSK",
            "status": "rts",
            "sr-status": 9,
            "sr-status-label": "RTO INITIATED"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-23 11:12:27",
            "activity": "Item added to bag at BLR_BSK",
            "status": "item_manifested",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "BLR_BSK",
            "date": "2022-05-23 13:38:13",
            "activity": "Bag in transit for return at BLR_BSK",
            "status": "in_transit_return",
            "sr-status": "NA",
            "sr-status-label": "NA"
        },
        {
            "location": "Bangalore DC",
            "date": "2022-05-23 16:36:46",
            "activity": "Bag received at Bangalore DC",
            "status": "bag_received",
            "sr-status": "NA",
            "sr-status-label": "NA"
        }
    ],
    is_return: 0,
    channel_id: 434872
};

export const dummyRequest = {
    order_id: IdMap.getId("test"),
    order_date: "2019-07-24 11:11",
    pickup_location: "Jammu",
    channel_id: "",
    comment: "Reseller: M/s Goku",
    billing_customer_name: "Naruto",
    billing_last_name: "Uzumaki",
    billing_address: "House 221B, Leaf Village",
    billing_address_2: "Near Hokage House",
    billing_city: "New Delhi",
    billing_pincode: "110002",
    billing_state: "Delhi",
    billing_country: "India",
    billing_email: "naruto@uzumaki.com",
    billing_phone: "9876543210",
    shipping_is_billing: true,
    shipping_customer_name: "",
    shipping_last_name: "",
    shipping_address: "",
    shipping_address_2: "",
    shipping_city: "",
    shipping_pincode: "",
    shipping_country: "",
    shipping_state: "",
    shipping_email: "",
    shipping_phone: "",
    order_items: [
        {
            name: "Kunai",
            sku: "chakra123",
            units: 10,
            selling_price: "900",
            discount: "",
            tax: "",
            hsn: 441122
        }
    ],
    payment_method: "Prepaid",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: 9000,
    length: 10,
    breadth: 15,
    height: 20,
    weight: 2.5
};
