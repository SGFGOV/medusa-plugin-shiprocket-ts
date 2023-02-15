import { ConfigModule, EventBusService, OrderService } from "@medusajs/medusa";
import { Response, Request } from "express";
import { EntityManager } from "typeorm";
import { createHash } from "node:crypto";

/**
 * Returns a SHA256 hash using SHA-2 for the given `content`.
 *
 * @see https://en.wikipedia.org/wiki/SHA-2
 *
 * @param {String} content
 *
 * @returns {String}
 */
function sha256(content) {
    return createHash("sha256").update(content).digest("hex");
}

import { ShipRocketStatus } from "../../../types/globals";

export default async (req: Request, res: Response) => {
    const manager = req.scope.resolve("manager") as EntityManager;
    const configModule = req.scope.resolve("configModule") as ConfigModule;

    const checkKey = req.headers["x-api-key"];
    const shippingHeaderKey =
        (configModule.projectConfig["secure_keys"]?.SHIPPING_HEADER_KEY ||
            process.env.SHIPPING_HEADER_KEY) ??
        "NO-KEY";
    if (checkKey != sha256(shippingHeaderKey)) {
        res.sendStatus(401);
        return;
    }

    const orderService = req.scope.resolve("orderService") as OrderService;
    const eventBusService = req.scope.resolve(
        "eventBusService"
    ) as EventBusService;
    const trackResult = req.body as ShipRocketStatus;
    const theOrder = await orderService.retrieve(trackResult.order_id);
    await eventBusService
        .withTransaction(manager)
        .emit("order.shipping.status.update", {
            orderId: theOrder.id,
            status: trackResult
        });
    res.sendStatus(200);
    return res;
};
