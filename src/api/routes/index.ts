import { Router } from "express";
import cors from "cors";
import shipRocketRoutes from "./shipping";

import { ConfigModule } from "@medusajs/medusa";
import { ShiprocketOptions } from "services/shiprocket-provider";

const router = Router();

export default (
    app: Router,
    rootDirectory: string,
    options: ShiprocketOptions,
    config: ConfigModule
): Router => {
    const corsOptions = {
        origin: config.projectConfig.store_cors.split(","),
        credentials: true
    };
    app.use("/shipping", router);
    router.options("/shipping", cors(corsOptions));
    shipRocketRoutes(router, options, config);

    return app;
};
