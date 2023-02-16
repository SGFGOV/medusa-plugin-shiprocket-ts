import { NextFunction, Request, Response } from "express";
import {
    createPackageValidator,
    listOrValueValidator,
    packageOrderValidator
} from "./package-validator-utils";

const { response } = require("@utils");

export function requestCreateOrder(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        createPackageValidator(req.body);
        next();
    } catch (e) {
        response.error(res, e);
    }
}

export async function packageOrders(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const orders = [];

        const { orderItems } = req.body;

        await orderItems.forEach((datum) => {
            const { name, sku, units, sellingPrice, discount, tax, hsn } =
                datum;
            packageOrderValidator(datum);
            orders.push({
                name,
                sku,
                units,
                discount,
                selling_price: sellingPrice,
                tax,
                hsn
            });
        });

        req["orderItems"] = orders;

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export async function packageParams(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {
            orderId,
            orderDate,
            pickupLocation,
            comment,
            billingCustomerName,
            billingLastName,
            billingAddress,
            billingAddressTwo,
            billingCity,
            billingPincode,
            billingState,
            billingCountry,
            billingEmail,
            billingPhone,
            orderItems,
            paymentMethod,
            shippingCharges,
            giftWrapCharges,
            transactionCharges,
            totalDiscount,
            subTotal,
            length,
            breadth,
            height,
            weight
        } = req.body;

        req["order"] = {
            order_id: orderId,
            order_date: orderDate,
            pickup_location: pickupLocation,
            comment,
            billing_customer_name: billingCustomerName,
            billing_last_name: billingLastName,
            billing_address: billingAddress,
            billing_address_2: billingAddressTwo,
            billing_city: billingCity,
            billing_pincode: billingPincode,
            billing_state: billingState,
            billing_country: billingCountry,
            billing_email: billingEmail,
            billing_phone: billingPhone,
            order_items: req["orderItems"],
            shipping_is_billing: true,
            payment_method: paymentMethod,
            shipping_charges: shippingCharges,
            giftwrap_charges: giftWrapCharges,
            transaction_charges: transactionCharges,
            total_discount: totalDiscount,
            sub_total: subTotal,
            length,
            breadth,
            height,
            weight
        };

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export function assignAWB(req: Request, res: Response, next: NextFunction) {
    try {
        const { shipmentId } = req.body;

        if (!shipmentId) {
            throw new Error(
                JSON.stringify({ code: 409, message: "Invalid shipment id" })
            );
        }

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export function shipmentIds(req: Request, res: Response, next: NextFunction) {
    try {
        const { shipmentIds } = req.body;

        listOrValueValidator(shipmentIds, "shipment Ids");

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export function orderIds(req: Request, res: Response, next: NextFunction) {
    try {
        const { orderIds } = req.body;

        listOrValueValidator(orderIds, "order Ids");

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export function throwError(error: { code?: number; message?: string }) {
    if (!error.code) {
        error.code = 409;
    }
    throw new Error(JSON.stringify(error));
}

export function shipmentPickUp(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { shipmentIds } = req.body;

        listOrValueValidator(shipmentIds, "shipment Ids");

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export function generateManifests(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { shipmentIds } = req.body;

        listOrValueValidator(shipmentIds, "shipment Ids");

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export function printManifests(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { orderIds } = req.body;

        listOrValueValidator(orderIds, "order Ids");

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export function cancelShipment(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { shipmentIds } = req.body;

        listOrValueValidator(shipmentIds, "shipment Ids");

        next();
    } catch (e) {
        response.error(res, e);
    }
}
