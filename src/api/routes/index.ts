import { Router } from "express";
import cors from "cors";
import shiprocketRoutes from "./shipping";
import trackingtRoutes from "./tracking";

import { ConfigModule } from "@medusajs/medusa";
import { ShiprocketOptions } from "../../services/shiprocket-provider";
import tracking from "./tracking";

const shippingRouter = Router();
const trackingRouter = Router();

export default (
    app: Router,
    rootDirectory: string,
    options: ShiprocketOptions,
    config: ConfigModule
): Router => {
    const corsStoreOptions = {
        origin: config.projectConfig.admin_cors.split(","),
        credentials: true
    };
    app.use("/shipping", shippingRouter);
    shippingRouter.options("/shipping", cors(corsStoreOptions));
    shiprocketRoutes(shippingRouter, options, config);
    const regex = /^\*\.shiprocket\.com$/i;
    const corsOptions = {
        origin: regex,
        credentials: true
    };
    app.use("/tracking", trackingRouter);
    trackingRouter.options("/tracking", cors(corsOptions));
    trackingtRoutes(trackingRouter, options, config);

    return app;
};
