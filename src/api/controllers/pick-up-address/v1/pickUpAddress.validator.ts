import { DataTypeNotSupportedError } from "typeorm";

const { response } = require("@utils");

export const registerAddress = async (req, res, next) => {
    try {
        validatePickupAddress(req.data);

        next();
    } catch (e) {
        response.error(res, e);
    }
};

export function throwError(error: { code: number; message: string }) {
    throw new Error(JSON.stringify(error));
}

export function validatePickupAddress(data) {
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
    } = data;

    if (!email) {
        throwError({ code: 409, message: "Invalid email" });
    }

    if (!phone) {
        throwError({ code: 409, message: "Invalid phone" });
    }

    const validPhone = global.phoneUtil.parseAndKeepRawInput(
        phone,
        process.env.COUNTRY_CODE
    );

    if (!validPhone) {
        throwError({ code: 409, message: "Invalid phone!" });
    }

    if (!title) {
        throwError({ code: 409, message: "Invalid title" });
    }

    if (!addressLineOne) {
        throwError({ code: 409, message: "Invalid address line one" });
    }

    if (addressLineOne.length < 10) {
        throwError({
            code: 409,
            message:
                "Invalid address line  must be at least of 10 character long"
        });
    }

    if (!addressLineTwo) {
        throwError({ code: 409, message: "Invalid address line two" });
    }

    if (!city) {
        throwError({ code: 409, message: "Invalid city" });
    }

    if (!pinCode) {
        throwError({ code: 409, message: "Invalid pin-code" });
    }

    if (pinCode.length !== 6) {
        throwError({ code: 409, message: "Invalid pin-code" });
    }

    if (!state) {
        throwError({ code: 409, message: "Invalid state" });
    }

    if (!country) {
        throwError({ code: 409, message: "Invalid country" });
    }
}

export default registerAddress;
