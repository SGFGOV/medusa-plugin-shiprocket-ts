import { ConfigModule } from "@medusajs/medusa";
import { Router } from "express";
import { getConfigFile } from "medusa-core-utils";
import { ShiprocketOptions } from "../services/shiprocket-provider";
import routes from "./routes";

/* TODO second argument pluginConfig: Record<string, unknown> part of PR https://github.com/medusajs/medusa/pull/959 not yet in master */
export default (
    rootDirectory: string,
    options: ShiprocketOptions,
    config: ConfigModule
): Router => {
    const app = Router();

    if (!config) {
        const { configModule } = getConfigFile(
            rootDirectory,
            "medusa-config"
        ) as Record<string, unknown>;
        config = configModule as ConfigModule;
    }

    routes(app, rootDirectory, options, config);

    return app;
};
