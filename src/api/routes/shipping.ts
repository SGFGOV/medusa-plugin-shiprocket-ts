import { ConfigModule } from "@medusajs/medusa";
import { Request, Response, Router } from "express";
import { ShiprocketOptions } from "services/shiprocket-provider";
import pickUpAddress from "./pickup-address";
import packageRouter from "./package";
// require('dotenv').config();
require("module-alias/register");
require("@cron");
const cors = require("cors");
const expressSanitizer = require("express-sanitizer");

const logger = require("morgan");
const helmet = require("helmet");
const bodyParser = require("body-parser");

const PNF = require("google-libphonenumber").PhoneNumberFormat;
const phoneUtil =
    require("google-libphonenumber").PhoneNumberUtil.getInstance();

const { shipRocket } = require("../middleware/");
global.PNF = global.PNF || PNF;
global.phoneUtil = global.phoneUtil || phoneUtil;
global.basePath = global.basePath || __dirname;

export default (
    app: Router,
    options: ShiprocketOptions,
    config: ConfigModule
) => {
    const corsOptions = {
        origin: config.projectConfig.store_cors.split(","),
        credentials: true
    };

    app.use(cors(corsOptions));
    app.use(logger("dev"));
    app.use(helmet());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(expressSanitizer());

    app.use("/pick-up-address", shipRocket.token, pickUpAddress);
    app.use("/package", shipRocket.token, packageRouter);

    // catch 404 and forward to error handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: "NO PAGE FOUND",
            data: null,
            pagination: null
        });
    });

    // error handler
    app.use((err: Error, req: Request, res: Response) => {
        // set locals, only providing error in development
        res.locals.message =
            process.env.NODE_ENV === "development"
                ? err.message
                : "Some error occurred";
        res.locals.error = process.env.NODE_ENV === "development" ? err : {};

        res.status(500).json({
            success: false,
            message: res.locals.error,
            data: null,
            pagination: null
        });
    });
};
