import { Request } from "express";
import { CreateOrderRequestOptions } from "../../../../types/globals";
import ShiprocketProviderService from "../../../../services/shiprocket-provider";
import response from "../../../../utils/response";

export const requestCreateOrder = async (
    req: Request & { order: CreateOrderRequestOptions },
    res
) => {
    try {
        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { fulfillment_id } = req.body;

        const { status, data, message } = await shipRocket.requestCreateOrder(
            fulfillment_id,
            req.order
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const assignAWB = async (req, res) => {
    try {
        const { shipmentId, fulfillmentId } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.generateAWB(
            fulfillmentId,
            shipmentId
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const generateLabel = async (req, res) => {
    try {
        const { shipmentIds, fulfillmentId } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.generateLabel(
            fulfillmentId,
            shipmentIds
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const generateInvoice = async (req, res) => {
    try {
        const { orderIds, fulfillmentId } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.generateInvoice(
            orderIds,
            fulfillmentId
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const shipmentPickUp = async (req, res) => {
    try {
        const { shipmentIds, fulfillmentId } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.shipmentPickUp(
            shipmentIds,
            fulfillmentId
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const generateManifests = async (req, res) => {
    try {
        const { shipmentIds, fulfillment_id } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.generateManifests(
            shipmentIds,
            fulfillment_id
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const printManifests = async (req, res) => {
    try {
        const { orderIds, fulfillmentId } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.printManifests(
            orderIds,
            fulfillmentId
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const deleteOrder = async (req, res) => {
    try {
        const { orderIds, fulfillmentId } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.deleteOrder(
            orderIds,
            fulfillmentId
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export const cancelShipment = async (req, res) => {
    try {
        const { shipmentIds } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.cancelShipment(
            shipmentIds
        );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};
