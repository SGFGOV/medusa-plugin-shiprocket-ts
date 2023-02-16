import { Request, Response } from "express";
import { CreatePickupLocationRequest } from "types/globals";
import ShiprocketProviderService from "../../../../services/shiprocket-provider";

import { response } from "../../../../utils";
export const registerAddress = async (req: Request, res: Response) => {
    try {
        const {
            email,
            phone,
            title,
            addressLineOne,
            addressLineTwo,
            city,
            pinCode,
            state,
            country,
            name
        } = req.body;

        const shipRocket = req.scope.resolve(
            "shiprocketProviderService"
        ) as ShiprocketProviderService;

        const body: CreatePickupLocationRequest = {
            pickup_location: title,
            name,
            email,
            phone,
            address: addressLineOne,
            address_2: addressLineTwo,
            city,
            state,
            country,
            pin_code: pinCode
        };

        const { status, data, message } = await shipRocket.createPickUpLocation(
            body
        );

        if (!status) {
            throw new Error(message);
        }

        response.success(res, { code: 200, message, data, pagination: null });
    } catch (e) {
        response.error(res, e);
    }
};

export default registerAddress;
