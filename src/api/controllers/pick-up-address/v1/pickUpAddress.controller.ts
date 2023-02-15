import { Request, Response } from "express";

import { response } from "../../../../utils";
const { ShipRocket } = require("@helper");

export const registerAddress = async (
    req: Request & { shipRocket: string },
    res: Response
) => {
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
            country
        } = req.body;

        const shipRocket = new ShipRocket(req.shipRocket);

        const body = {
            name: title,
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
