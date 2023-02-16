import { Request } from "express";
import { CreateOrderRequestOptions } from "../../../../types/globals";
import ShiprocketProviderService from "../../../../services/shiprocket-provider";
import response from "../../../../utils/response";

export const quickReturnController = async (req, res) => {
    try {
        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const { status, data, message } = await shipRocket.postQuickReturn(
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
export default quickReturnController;
