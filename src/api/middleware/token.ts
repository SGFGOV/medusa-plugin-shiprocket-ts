import { NextFunction, Request, Response } from "express";
import response from "../../utils/response";
import RealRedis from "ioredis";

export const token = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const redisClient = req["scope"].resolve(
            "redisClient"
        ) as RealRedis.Redis;
        req["shipRocket"] = await redisClient.get("SHIPROCKET_API_KEY");

        next();
    } catch (e) {
        response.error(res, e);
    }
};

export default token;
