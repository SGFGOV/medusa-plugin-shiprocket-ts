import { ConfigModule } from "@medusajs/medusa";
import { Router } from "express";
import { ShiprocketOptions } from "../services/shiprocket-provider";
import routes from "./routes";

/* TODO second argument pluginConfig: Record<string, unknown> part of PR https://github.com/medusajs/medusa/pull/959 not yet in master */
export default (
    rootDirectory: string,
    options: ShiprocketOptions,
    config: ConfigModule
): Router => {
    const app = Router();

    routes(app, rootDirectory, options, config);

    return app;
};
