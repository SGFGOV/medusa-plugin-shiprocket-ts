import Router from "express";

const router = Router();

import {
    pickUpAddressValidator,
    pickUpAddressController
} from "../controllers/pick-up-address/v1";

/* GET users listing. */
router.post(
    "/create",
    pickUpAddressValidator.registerAddress,
    pickUpAddressController.registerAddress
);

export default router;
