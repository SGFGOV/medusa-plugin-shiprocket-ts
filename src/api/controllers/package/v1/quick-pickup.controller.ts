import { Request, Response } from "express";

import ShiprocketProviderService from "../../../../services/shiprocket-provider";
import response from "../../../../utils/response";

export const quickPickupController = async (req: Request, res: Response) => {
    try {
        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } =
            await shipRocket.postQuickCreateForward(
                req.body.fulfillment_id,
                req.body
            );

        if (!status) {
            throw new Error(JSON.stringify({ code: 409, message }));
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export default quickPickupController;
