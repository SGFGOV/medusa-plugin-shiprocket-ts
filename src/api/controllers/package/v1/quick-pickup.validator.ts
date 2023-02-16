import { NextFunction, Request, Response } from "express";
import { QuickForwardRequest } from "../../../../types/quick-response";
import { listOrValueValidator } from "./package-validator-utils";
import response from "../../../../utils/response";
export function createQuickForwardValidator(data: QuickForwardRequest) {
    listOrValueValidator;

    const keys = Object.keys(data);
    for (const key of keys) {
        if (!data[key]) {
            throw new Error(
                JSON.stringify({ code: 409, message: `Invalid ${key}!` })
            );
        }
    }
}

export function createQuickForward(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        createQuickForwardValidator(req.body);

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export default createQuickForward;
