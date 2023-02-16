const express = require("express");
const router = express.Router();
import {
    packageController,
    quickPickupController,
    quickPickupValidator,
    quickReturnValidator
} from "../controllers/package/v1";
import { packageValidator } from "../controllers/package/v1";

/* GET users listing. */
router.post(
    "/create-order",
    packageValidator.requestCreateOrder,
    packageValidator.packageOrders,
    packageValidator.packageParams,
    packageController.requestCreateOrder
);

router.post(
    "/assign-awb",
    packageValidator.assignAWB,
    packageController.assignAWB
);

router.post(
    "/generate-label",
    packageValidator.shipmentIds,
    packageController.generateLabel
);

router.post(
    "/generate-invoice",
    packageValidator.orderIds,
    packageController.generateInvoice
);

router.post(
    "/shipment-pickup",
    packageValidator.shipmentIds,
    packageController.shipmentPickUp
);

router.post(
    "/generate-manifest",
    packageValidator.shipmentIds,
    packageController.generateManifests
);

router.post(
    "/print-manifest",
    packageValidator.orderIds,
    packageController.printManifests
);

router.post(
    "/quick-pickup",
    quickPickupValidator.createQuickForwardValidator,
    quickPickupController.quickPickupController
);

router.post(
    "/quick-return",
    quickReturnValidator.createQuickReturnValidator,
    quickPickupController.quickPickupController
);

router.delete(
    "/delete-order",
    packageValidator.orderIds,
    packageController.deleteOrder
);

router.delete(
    "/cancel-shipment",
    packageValidator.cancelShipment,
    packageController.cancelShipment
);

export default router;
