import { EventBusService, OrderService } from "@medusajs/medusa";
import ShiprocketProviderService from "../services/shiprocket-provider";
import { ShiprocketResult } from "../services/shiprocket-provider";

export interface ShiprocketSubscriberParams {
    eventBusService: EventBusService;
    shiprocketProviderService: ShiprocketProviderService;
    orderService: OrderService;
}

class ShiprocketSubscriber {
    shiprocketProviderService: ShiprocketProviderService;
    orderService: OrderService;
    eventBusService: EventBusService;

    constructor(container: ShiprocketSubscriberParams) {
        this.shiprocketProviderService = container.shiprocketProviderService;
        this.orderService = container.orderService;
        this.eventBusService = container.eventBusService;

        this.eventBusService.subscribe(
            OrderService.Events.SHIPMENT_CREATED,
            this.handleShipment
        );
    }

    handleShipment = async (shipment: ShipmentCreatedEvent): Promise<void> => {
        await this.shiprocketProviderService.createShipmentFromFulfillment({
            id: shipment.id,
            fulfillment_id: shipment.fulfillment_id,
            no_notification: shipment.no_notification
        });
    };
}

export interface ShipmentCreatedEvent {
    id: string;
    fulfillment_id: string;
    no_notification: boolean;
}

export default ShiprocketSubscriber;
