import { NextFunction, Request, Response } from "express";
import { QuickReturnRequest } from "../../../../types/quick-response";
import { listOrValueValidator } from "./package-validator-utils";
import response from "../../../../utils/response";
export function createQuickReturnValidator(data: QuickReturnRequest) {
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

export function createQuickReturn(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        createQuickReturnValidator(req.body);

        next();
    } catch (e) {
        response.error(res, e);
    }
}

export default createQuickReturn;
