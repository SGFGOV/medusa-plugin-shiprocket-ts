import { EntityManager } from "typeorm";
const isolationLevel = "SERIALIZABLE";
import otpGenerator from "otp-generator";
import {
    ClaimService,
    EventBusService,
    OrderService,
    SwapService,
    UserService
} from "@medusajs/medusa/dist/services";
import {
    TotalsService,
    FulfillmentProviderService,
    LineItemService,
    ProductVariantInventoryService,
    ShippingProfileService,
    Cart,
    Logger,
    ShippingMethod,
    FulfillmentItem,
    Fulfillment,
    Order,
    ReturnItem,
    StockLocationDTO,
    ShippingOption,
    MoneyAmount
} from "@medusajs/medusa";
import { IStockLocationService } from "@medusajs/medusa";
import { FulfillmentService } from "medusa-interfaces";
import { FulfillmentRepository } from "@medusajs/medusa/dist/repositories/fulfillment";
import { LineItemRepository } from "@medusajs/medusa/dist/repositories/line-item";
import { TrackingLinkRepository } from "@medusajs/medusa/dist/repositories/tracking-link";
import { AxiosInstance, default as axios } from "axios";
import JobSchedulerService from "@medusajs/medusa/dist/services/job-scheduler";
import {
    Address,
    awb_number,
    CreatePickupLocationRequest,
    CreatePickupLocationResponse,
    CreateOrderRequestOptions,
    CreateReturnRequestOptions,
    InternationalServiceabilityOptions,
    OrderItem,
    OrderReturnItem,
    PickupAddressesResponse,
    ProductOptions,
    ServiceabilityOptions,
    CreateOrderResponse,
    AssignAwbResponse
} from "../types/globals";
import { createPackageValidator } from "../api/controllers/package/v1/package-validator-utils";
import { ChannelSettings } from "../types/channel";
import { COUNTRY_CODES } from "../utils/country";
import {
    QuickForwardRequest,
    QuickReturnRequest
} from "../types/quick-response";
import { ShipmentCreatedEvent } from "../subscribers";
import { incDay } from "../utils";

export type ShiprocketResult = {
    status: boolean;
    data: any;
    message: string;
};

export interface ShiprocketServiceParams {
    manager: EntityManager;
    userService: UserService;
    jobSchedulerService: JobSchedulerService;
    eventBusService: EventBusService;
    totalsService: TotalsService;
    shippingProfileService: ShippingProfileService;
    lineItemService: LineItemService;
    fulfillmentProviderService: FulfillmentProviderService;
    fulfillmentRepository: typeof FulfillmentRepository;
    trackingLinkRepository: typeof TrackingLinkRepository;
    lineItemRepository: typeof LineItemRepository;
    orderService: OrderService;
    claimService: ClaimService;
    swapService: SwapService;
    productVariantInventoryService: ProductVariantInventoryService;
    logger: Logger;
    stockLocationService: IStockLocationService;
}

export interface ShiprocketOptions {
    channelId: string;
    api_key?: string;
    shiprocket_url: string;
    shiprocket_username?: string;
    shiprocket_password?: string;
    enable_next_day_pickup?: boolean;
}

class ShiprocketProviderService extends FulfillmentService {
    static identifier = "shiprocket";
    fulfillmentTypes = [
        "shiprocket-india-only-domestic-surface",
        "shiprocket-india-only-domestic-air",
        "shiprocket-india-only-domestic-surface-cod",
        "shiprocket-india-only-domestic-air-cod",
        "shiprocket-international"
    ];
    options: ShiprocketOptions;
    eventBusService: EventBusService;

    public transactionManager: EntityManager;
    tokenRefreshService: JobSchedulerService;
    axiosAuthInstance: AxiosInstance;
    axiosInstance: AxiosInstance;
    token: string;
    totalsService_: TotalsService;
    shippingProfileService_: ShippingProfileService;
    lineItemService_: LineItemService;
    fulfillmentProviderService_: FulfillmentProviderService;
    fulfillmentRepository_: typeof FulfillmentRepository;
    trackingLinkRepository_: typeof TrackingLinkRepository;
    lineItemRepository_: typeof LineItemRepository;
    productVariantInventoryService_: ProductVariantInventoryService;
    stockLocationService: IStockLocationService;
    logger: Logger;
    invoiceGenerator_: any;
    orderService: OrderService;
    claimService: ClaimService;
    swapService: SwapService;
    manager: EntityManager;
    userService: UserService;
    user: string;
    constructor(
        container: ShiprocketServiceParams,
        options: ShiprocketOptions
    ) {
        super();
        this.logger = container.logger;
        this.eventBusService = container.eventBusService;
        this.options = options;
        this.tokenRefreshService = container.jobSchedulerService;
        this.manager = container.manager;
        this.eventBusService = container.eventBusService;
        this.totalsService_ = container.totalsService;
        this.shippingProfileService_ = container.shippingProfileService;
        this.lineItemService_ = container.lineItemService;
        this.fulfillmentProviderService_ = container.fulfillmentProviderService;
        this.orderService = container.orderService;
        this.fulfillmentRepository_ = container.fulfillmentRepository;
        this.userService = container.userService;
        this.stockLocationService = container.stockLocationService;

        this.trackingLinkRepository_ = container.trackingLinkRepository;
        this.lineItemRepository_ = container.lineItemRepository;
        this.productVariantInventoryService_ =
            container.productVariantInventoryService;

        this.axiosAuthInstance = axios.create({
            baseURL:
                this.options.shiprocket_url ??
                "https://apiv2.shiprocket.in/v1/external",
            headers: {
                "content-type": "application/json"
            }
        });

        this.tokenRefreshService.create(
            "__default__",
            {},
            "00 1 * * *",
            async (): Promise<void> => {
                try {
                    const { status, data, message } = await this.login();

                    if (!status) {
                        throw new Error(message);
                    }
                    this.token = data.token;
                } catch (e) {
                    console.log(e.message);
                }
            },
            {
                keepExisting: false
            }
        );

        this.login().then((result) => {
            this.configureAxiosInstance(result);
        });
    }

    configureAxiosInstance(result: ShiprocketResult): void {
        const { status, data, message } = result;
        this.token = data.token;
        this.axiosInstance = axios.create({
            baseURL:
                this.options.shiprocket_url ??
                "https://apiv2.shiprocket.in/v1/external",
            headers:
                process.env.NODE_ENV != "test"
                    ? {
                          "content-type": "application/json",
                          "Authorization": `Bearer ${this.token}`,
                          "connection": "keep-alive"
                      }
                    : {
                          "content-type": "application/json",
                          "Authorization": `Bearer ${this.token}`,
                          "User-Agent": "PostmanRuntime/7.31.10",
                          "connection": "keep-alive"
                      }
        });
    }

    withTransaction(): this {
        const cloned = new ShiprocketProviderService(
            {
                manager: this.transactionManager ?? this.manager,
                eventBusService: this.eventBusService,
                totalsService: this.totalsService_,
                shippingProfileService: this.shippingProfileService_,
                lineItemService: this.lineItemService_,
                fulfillmentProviderService: this.fulfillmentProviderService_,
                fulfillmentRepository: this.fulfillmentRepository_,
                trackingLinkRepository: this.trackingLinkRepository_,
                lineItemRepository: this.lineItemRepository_,
                productVariantInventoryService:
                    this.productVariantInventoryService_,
                jobSchedulerService: this.tokenRefreshService,
                logger: this.logger,
                orderService: this.orderService,
                claimService: this.claimService,
                swapService: this.swapService,
                userService: this.userService,
                stockLocationService: this.stockLocationService
            },
            this.options
        );

        cloned.transactionManager = this.transactionManager;

        return cloned as this;
    }
    async createShipmentFromFulfillment(
        shipmentEvent: ShipmentCreatedEvent
    ): Promise<ShiprocketResult[]> {
        const order = await this.orderService.retrieve(shipmentEvent.id);
        const methods = order.shipping_methods.filter(
            (m) => m.shipping_option.provider_id == this.getIdentifier()
        );
        if (methods.length > 0) {
            return await this.atomicPhase_(
                async (manager: EntityManager) => {
                    const fulfillmentRepository = manager.getCustomRepository(
                        this.fulfillmentRepository_
                    );
                    try {
                        const fulfillment = await fulfillmentRepository.findOne(
                            shipmentEvent.fulfillment_id
                        );
                        const shiprocketData =
                            fulfillment.data as unknown as ShiprocketResult[];
                        const shiprocketAwbResponse = await this.generateAllAwb(
                            fulfillment.id,
                            shiprocketData
                        );
                        await Promise.all(shiprocketAwbResponse);
                        const fulfillmentSaved =
                            await fulfillmentRepository.save(fulfillment);
                    } catch (e) {
                        this.parseError(e);
                    }
                },
                isolationLevel,
                false
            );
        }
    }
    /**
     * Over writes fulfilment data
     * @param fulfillment_id
     * @param dataToSave
     * @enr
     * @returns
     */

    async updateFulfillment(
        fulfillment_id: string,
        dataToSave: ShiprocketResult | ShiprocketResult[],
        entity?: string,
        shipment_id?: string
    ): Promise<Fulfillment> {
        return await this.atomicPhase_(
            async (manager: EntityManager) => {
                const fulfillmentRepository = manager.getCustomRepository(
                    this.fulfillmentRepository_
                );
                try {
                    const fulfillment = await fulfillmentRepository.findOne(
                        fulfillment_id
                    );
                    const shippings = (
                        fulfillment.data as unknown as ShiprocketResult[]
                    ).filter((s) => {
                        return s?.data?.shipment_id == shipment_id;
                    });

                    if (!shippings[0]) {
                        shippings.push({
                            status: true,
                            data: undefined,
                            message: ""
                        });
                    }
                    const dataToUpdate = shippings[0];
                    if (entity) {
                        if (!dataToUpdate.data[entity]) {
                            dataToUpdate.data[entity] = dataToSave;
                        } else {
                            Object.assign(
                                dataToUpdate.data[entity],
                                dataToSave
                            );
                        }
                    } else {
                        Object.assign(dataToUpdate.data, dataToSave);
                    }

                    const fulfillmentSaved = await fulfillmentRepository.save(
                        fulfillment
                    );
                    return fulfillmentSaved;
                } catch (e) {
                    this.parseError(e);
                }
            },
            isolationLevel,
            false
        );
    }

    async generateAllAwb(
        fulfillment_id: string,
        shiprocketData: ShiprocketResult[] | ShiprocketResult
    ): Promise<ShiprocketResult[]> {
        const shiprocketDataToProcess = Array.isArray(shiprocketData)
            ? shiprocketData
            : [shiprocketData];
        const shiprocketCreateResponse = shiprocketDataToProcess.map(
            async (sr, index) => {
                const createResponse = sr.data as CreateOrderResponse;
                try {
                    const awb = await this.generateAWB(
                        fulfillment_id,
                        createResponse.shipment_id.toString()
                    );
                    const awbAndShipmentData = shiprocketData[index];
                    awbAndShipmentData["awb"] = (
                        awb.data as AssignAwbResponse
                    ).response.data.awb_code;
                    if (this.options.enable_next_day_pickup) {
                        const pickupResponse = await this.createPickupRequest(
                            fulfillment_id,
                            createResponse.shipment_id.toString(),
                            incDay(new Date(), 1)
                        );
                        awbAndShipmentData["pickupResponse"] = pickupResponse;
                        const otp = otpGenerator.generate(6, {
                            lowerCaseAlphabets: false,
                            upperCaseAlphabets: false,
                            specialChars: false
                        });
                        awbAndShipmentData["otp"] = otp;
                        awbAndShipmentData["otp_used"] = otp;
                    } else {
                        /** incase of pick up later */
                        const otp = otpGenerator.generate(6, {
                            lowerCaseAlphabets: false,
                            upperCaseAlphabets: false,
                            specialChars: false
                        });
                        awbAndShipmentData["otp"] = otp;
                        awbAndShipmentData["otp_used"] = "";
                    }
                    awbAndShipmentData["requestedAt"] =
                        new Date().toISOString();
                    return sr;
                } catch (e) {
                    this.parseError(e);
                }
            }
        );
        return (await Promise.all(shiprocketCreateResponse)).filter(
            (s) => s != undefined
        );
    }

    getPrice(
        prices: MoneyAmount[],
        currency_code: any
    ): MoneyAmount | undefined {
        const price = prices.filter(
            (p) =>
                p.currency_code.toLocaleUpperCase() ==
                currency_code.toLocaleUpperCase()
        );
        if (price.length > 0) {
            return price[0];
        }
    }

    setTransactionManager(transactionManager: EntityManager): this {
        this.transactionManager = transactionManager;
        return this;
    }

    async login(): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosAuthInstance.post("auth/login", {
                email: this.options.shiprocket_username,
                password: this.options.shiprocket_password
            });

            if (result.status !== 200) {
                throw new Error("Unable to get auth-token!");
            }

            const response = {
                status: true,
                message: "Auth token fetched!",
                data: result.data
            };
            return response;
        } catch (error) {
            return {
                status: false,
                message: `Error while operating ${error.message}`,
                data: null
            };
        }
    }

    async createPickUpLocation(
        request: CreatePickupLocationRequest
    ): Promise<ShiprocketResult> {
        try {
            const {
                name,
                email,
                phone,
                address,
                address_2,
                city,
                state,
                country,
                pin_code,
                pickup_location
            } = request;

            const result = await this.axiosInstance.post(
                "settings/company/addpickup",
                {
                    pickup_location,
                    name,
                    email,
                    phone,
                    address,
                    address_2,
                    city,
                    state,
                    country,
                    pin_code
                }
            );

            const { success, address: addressData } = result.data;

            if (!success) {
                throw new Error("Unable to register address");
            }

            return {
                status: success,
                data: addressData,
                message: "Address registered successfully!"
            };
        } catch (error) {
            const { response } = error;

            const message = this.parseError(response);

            return {
                status: false,
                data: null,
                message: message || "Unable to register address"
            };
        }
    }

    private async requestCreateOrder(
        request: CreateOrderRequestOptions
    ): Promise<ShiprocketResult> {
        try {
            const {
                order_id,
                order_date,
                pickup_location,
                channel_id,
                comment,
                shipping_is_billing,
                order_items,
                payment_method
            } = request;

            const shippingAddress = {
                shipping_customer_name: `${request.shipping_address?.first_name} ${request.shipping_address?.last_name}`,
                shipping_last_name: request.shipping_address?.last_name,
                shipping_address: request.shipping_address?.address,
                shipping_address_2: request.shipping_address?.address_2,
                shipping_city: request.shipping_address?.city,
                shipping_pincode: request.shipping_address?.pincode,
                shipping_state: request.shipping_address?.state,
                shipping_country: request.shipping_address?.country,
                shipping_email: request.shipping_address?.email,
                shipping_phone: request.shipping_address?.phone
            };

            const orderRequest = {
                order_id,
                order_date,
                pickup_location,
                channel_id,
                comment,
                billing_customer_name:
                    `${request.billing_address.first_name}` +
                    ` ${request.billing_address.last_name}`,
                billing_last_name: request.billing_address.last_name,
                billing_address: request.billing_address.address,
                billing_address_2: request.billing_address.address_2,
                billing_city: request.billing_address.city,
                billing_pincode: request.billing_address.pincode,
                billing_state: request.billing_address.state,
                billing_country: request.billing_address.country,
                billing_email: request.billing_address.email,
                billing_phone: request.billing_address.phone,
                shipping_is_billing,
                order_items,
                payment_method,
                shipping_charges: request.priceInfo.shipping_charges,
                giftwrap_charges: request.priceInfo.shipping_charges,
                transaction_charges: request.priceInfo.transaction_charges,
                total_discount: request.priceInfo.total_discount,
                sub_total: request.priceInfo.sub_total,
                length: request.packageInfo.length,
                breadth: request.packageInfo.breadth,
                height: request.packageInfo.height,
                weight: request.packageInfo.weight
            };
            let orderRequestWithAddress = orderRequest;
            if (!shipping_is_billing) {
                orderRequestWithAddress = {
                    shipping_is_billing: !shipping_is_billing ? 0 : 1,
                    ...orderRequest,
                    ...shippingAddress
                };
            }

            const result = await this.axiosInstance.post(
                "orders/create/adhoc",
                orderRequestWithAddress
            );

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            const response = {
                status: true,
                data,
                message: "Pickup request placed successfully!"
            };

            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async requestCreateReturnOrder(
        request: CreateReturnRequestOptions
    ): Promise<ShiprocketResult> {
        try {
            const {
                order_id,
                order_date,
                channel_id,
                pickup_customer_name,
                pickup_last_name,
                pickup_address,
                pickup_address_2,
                pickup_city,
                pickup_pincode,
                pickup_state,
                pickup_country,
                pickup_email,
                pickup_phone,
                order_items,
                payment_method,
                total_discount,
                sub_total,
                length,
                breadth,
                height,
                weight
            } = request;

            const result = await this.axiosInstance.post(
                "orders/create/return",
                {
                    order_id,
                    order_date,
                    channel_id,
                    pickup_customer_name,
                    pickup_last_name,
                    pickup_address,
                    pickup_address_2,
                    pickup_city,
                    pickup_pincode,
                    pickup_state,
                    pickup_country,
                    pickup_email,
                    pickup_phone,
                    order_items,
                    payment_method,
                    total_discount,
                    sub_total,
                    length,
                    breadth,
                    height,
                    weight
                }
            );

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            const response = {
                status: true,
                data,
                message: "Pickup request placed successfully!"
            };
            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async generateAWB(
        fulfillment_id: string,
        shipment_id: string,
        courier_id?: string,
        status?: string
    ): Promise<ShiprocketResult> {
        const courierSelection = courier_id
            ? {
                  shipment_id,
                  courier_id
              }
            : {
                  shipment_id
              };

        const requestData = status
            ? {
                  ...courierSelection,
                  status
              }
            : {
                  ...courierSelection
              };
        try {
            const result = await this.axiosInstance.post(
                "courier/assign/awb",
                requestData
            );

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            const returnData = (data as AssignAwbResponse).response.data;

            await this.atomicPhase_(
                async (manager: EntityManager) => {
                    await this.eventBusService
                        .withTransaction(manager)
                        .emit("SHIPROCKET.AWB.CREATED", {
                            shipment_id,
                            response: returnData
                        });
                },
                isolationLevel,
                false
            );
            const shiprocketResult = {
                status: true,
                data: { shipment_id, ...returnData },
                message: "AWB assigned successfully!"
            };
            await this.updateFulfillment(
                fulfillment_id,

                shiprocketResult,
                "awb_generation"
            );
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async findShipmentInFulFillmentList(
        fulfillment_id,
        shipment_id
    ): Promise<ShiprocketResult[]> {
        return await this.atomicPhase_(
            async (manager: EntityManager) => {
                const fulfillmentRepository = manager.getCustomRepository(
                    this.fulfillmentRepository_
                );
                try {
                    const fulfillment = await fulfillmentRepository.findOne(
                        fulfillment_id
                    );
                    const shippings =
                        fulfillment?.data as unknown as ShiprocketResult[];
                    shippings.filter((s) => s.data.shipping_id == shipment_id);
                    return shippings;
                } catch (e) {
                    this.parseError(e);
                }
            },
            isolationLevel,
            false
        );
    }

    async generateLabel(
        fulfillment_id: string,
        shipment_id: string
    ): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post(
                "courier/generate/label",
                {
                    shipment_id
                }
            );

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            const { not_created, label_url } = data;

            if (not_created.length > 0) {
                throw new Error("Error while generating labels!");
            }

            const shiprocketResult = {
                status: true,
                data: label_url,
                message: "Label generated successfully!"
            };
            await this.updateFulfillment(
                fulfillment_id,
                shiprocketResult,
                "awb_generation"
            );
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async generateInvoice(
        ids: string[],
        fulfillment_id: string
    ): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post(
                "orders/print/invoice",
                {
                    ids
                }
            );

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            const { is_invoice_created, not_created, invoice_url } = data;

            if (!is_invoice_created) {
                throw new Error(
                    JSON.stringify({
                        code: 409,
                        message: "Unable to generate invoice!"
                    })
                );
            }

            if (not_created.length > 0) {
                throw new Error("Error while generating invoices!");
            }

            const response = {
                status: true,
                data: invoice_url,
                message: "Invoice generated successfully!"
            };
            await this.updateFulfillment(fulfillment_id, response, "invoice");
            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async shipmentPickUp(
        shipment_id: string,
        fulfillment_id: string
    ): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post(
                "courier/generate/pickup",
                {
                    shipment_id
                }
            );

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            const returnData = {} as any;

            const {
                pickup_scheduled_date,
                pickup_token_number,
                status: pickUpStatus,
                pickup_generated_date,
                data: message
            } = data.response;

            returnData.pickup_status = data.pickup_status;
            returnData.pickup_scheduled_date = pickup_scheduled_date;
            returnData.pickup_token_number = pickup_token_number;
            returnData.status = pickUpStatus;
            returnData.pickup_generated_date = pickup_generated_date;

            const response = {
                status: true,
                data: returnData,
                message: "Invoice generated successfully!"
            };
            await this.updateFulfillment(fulfillment_id, response, "pickup");

            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async generateManifests(
        shipment_id: string,
        fulfillment_id: string
    ): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post("manifests/generate", {
                shipment_id
            });

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            const { manifest_url } = data;

            const response = {
                status: true,
                data: manifest_url,
                message: "Manifest generated successfully!"
            };
            await this.updateFulfillment(fulfillment_id, response, "manifest");

            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async printManifests(
        order_ids: string[],
        fulfillment_id: string
    ): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post("manifests/print", {
                order_ids
            });

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            const { manifest_url } = data;

            const response = {
                status: true,
                data: manifest_url,
                message: "Manifest generated successfully!"
            };
            await this.updateFulfillment(
                fulfillment_id,
                response,
                "print_manifests"
            );
            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async deleteOrder(ids, fulfillment_id: string): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post("orders/cancel", {
                ids: Array.isArray(ids) ? ids : [ids]
            });

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }
            const response = {
                status: true,
                data: true,
                message: "Orders cancelled successfully!"
            };
            await this.updateFulfillment(
                fulfillment_id,
                response,
                "order-deleted"
            );
            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    validateData(result): {
        status: boolean;
        data: any;
    } {
        if (result.status === 400) {
            return { status: false, data: result.data };
        } else if (result.status === 412) {
            return { status: false, data: result.data };
        } else if (result.status === 200) {
            return { status: true, data: result.data };
        }
    }

    parseError(errorResponse): string {
        try {
            const { response } = errorResponse;
            if (!response) {
                throw new Error(errorResponse.message);
            }
            const { data } = response;

            if (!data) {
                throw new Error(errorResponse.message);
            }

            return JSON.stringify(data.errors) || "Error while operating!";
        } catch (e) {
            return e.message;
        }
    }
    getIdentifier(): string {
        return ShiprocketProviderService.identifier;
    }
    /**
     * Called before a shipping option is created in Admin. The method should
     * return all of the options that the fulfillment provider can be used with,
     * and it is here the distinction between different shipping options are
     * enforced. For example, a fulfillment provider may offer Standard Shipping
     * and Express Shipping as fulfillment options, it is up to the store operator
     * to create shipping options in Medusa that can be chosen between by the
     * customer.
     *
     */

    getFulfillmentOptions(): { id: string }[] {
        return this.fulfillmentTypes.map((p) => {
            return {
                id: p
            };
        });
    }
    /**
     * Called before a shipping option is created in Admin. Use this to ensure
     * that a fulfillment option does in fact exist.
     * @param data - the option to validate
     * @returns - boolean
     */
    async validateOption(data: any): Promise<boolean> {
        const channel_id = parseInt(this.options.channelId);
        const channelVerificationResults = await this.getChannels();
        const channelData = channelVerificationResults.data as ChannelSettings;
        channelData.data.filter((d) => d.id == channel_id);

        return this.fulfillmentTypes.includes(data.id);
    }

    /**
     * Called before a shipping method is set on a cart to ensure that the data
     * sent with the shipping method is valid. The data object may contain extra
     * data about the shipment such as an id of a drop point. It is up to the
     * fulfillment provider to enforce that the correct data is being sent
     * through.
     * @param {object} optionData - the data to validate
     * @param {object} data - the data to validate
     * @param {object | undefined} cart - the cart to which the shipping method will be applied
     * @return {object} the data to populate `cart.shipping_methods.$.data` this
     *    is usually important for future actions like generating shipping labels
     */
    validateFulfillmentData(
        optionData: ShippingOption,
        data: Record<string, any>,
        cart: Cart | undefined
    ): Record<string, any> {
        try {
            this.fulfillmentTypes.includes(optionData.id);
            if (
                cart.billing_address.country_code == "IN" &&
                (optionData.id != this.fulfillmentTypes[0] ||
                    optionData.id != this.fulfillmentTypes[1] ||
                    optionData.id != this.fulfillmentTypes[2] ||
                    optionData.id != this.fulfillmentTypes[3])
            ) {
                throw new Error("Invalid shipping option selected");
            }

            if (
                cart.billing_address.country_code != "IN" &&
                optionData.id != this.fulfillmentTypes[1]
            ) {
                throw new Error(
                    "Invalid shipping option selected for international shipping"
                );
            }

            createPackageValidator(data);
            return data;
        } catch (error) {
            this.logger.error(error.message);
            return {
                status: 409,
                message: `Invalid shipping option configuration ${error.message}`
            };
        }
    }
    canCalculate(data: any): boolean {
        return true;
    }

    async createFulfillment(
        shippingMethod: ShippingMethod,
        items: FulfillmentItem[],
        order: Order,
        fulfillment: Fulfillment
    ): Promise<ShiprocketResult[]> {
        /** *
         * steps
         * 1. login
         * 2. get serviceability
         * 3. create shiprocket order
         * 4. assign awb
         * 5. pickup request
         * 6. create manifest
         * 7. print manifest
         * 8. generate label
         * 9. invoice
         * 10. tracking
         */

        /* step 1 */
        if (!this.token) {
            const loginResult = await this.login();
            this.token = loginResult.data.token;
        }

        if (
            (await this.checkServiceability(order, shippingMethod, false))
                .length < 0
        ) {
            throw new Error("No Services");
        }

        const billing_address: Address = {
            first_name: order.billing_address.first_name,
            last_name: order.billing_address.last_name,
            phone: order.billing_address.phone,
            email: order.customer.email,
            city: order.billing_address.city,
            state: order.billing_address.province,
            pincode: order.billing_address.postal_code,
            country: order.billing_address.country.name,
            address: order.billing_address.address_1,
            address_2: order.billing_address.address_2
        };
        const locations = items.map(
            (item) => item.fulfillment?.location_id ?? fulfillment.location_id
        );
        const result = locations.map(async (pickUpLocation) => {
            const itemsAtLocation = items.filter(
                (item) =>
                    (item.fulfillment?.location_id ??
                        fulfillment.location_id) == pickUpLocation
            );

            return await this.createOrderAtLocation(
                shippingMethod,
                itemsAtLocation,
                order,
                fulfillment,
                billing_address,
                pickUpLocation
            );
        });

        return Promise.all(result);
    }

    async checkServiceability(
        order: Order,
        shippingMethod: ShippingMethod,
        isReturn: boolean
    ): Promise<Fulfillment[]> {
        const result = order.fulfillments.map(async (fulfillment) => {
            const stockLocation = await this.stockLocationService.retrieve(
                fulfillment.location_id
            );

            const delivery_country_code = order.shipping_address?.country_code;
            let serviceability: ShiprocketResult[];
            if (delivery_country_code == "IN") {
                const mode =
                    shippingMethod.shipping_option_id ==
                        this.fulfillmentTypes[0] ||
                    shippingMethod.shipping_option_id ==
                        this.fulfillmentTypes[2]
                        ? "Surface"
                        : "Air";
                const cod =
                    shippingMethod.shipping_option_id ==
                        this.fulfillmentTypes[2] ||
                    shippingMethod.shipping_option_id ==
                        this.fulfillmentTypes[3]
                        ? true
                        : false;
                serviceability = await this.checkIndiaServiceAbility(
                    order,
                    stockLocation,
                    mode,
                    cod,
                    isReturn
                );
            } else {
                serviceability = await this.checkInternationalServiceAbility(
                    order,
                    stockLocation
                );
            }
            fulfillment["serviceability"] = serviceability;
            return fulfillment;
        });
        return await Promise.all(result);
    }
    async checkIndiaServiceAbility(
        order: Order,
        stockLocation: StockLocationDTO,
        mode: "Surface" | "Air",
        cod: boolean,
        isReturn: boolean
    ): Promise<ShiprocketResult[]> {
        const result = order.items.map(async (item) => {
            const options: ServiceabilityOptions = {
                pickup_pincode: stockLocation.address.postal_code,
                delivery_pincode: order.shipping_address?.postal_code,
                cod: cod,
                weight: item.variant.weight,
                height: item.variant.height,
                length: item.variant.length,
                breadth: item.variant.length,
                mode,
                price: item.unit_price * item.quantity,
                orderId: order.id,
                is_return: isReturn
            };
            return await this.getServiceability(options);
        });
        const serviceabilityResult = await Promise.all(result);
        return serviceabilityResult;
    }
    async checkInternationalServiceAbility(
        order: Order,
        stockLocation: StockLocationDTO
    ): Promise<ShiprocketResult[]> {
        const result = order.items.map(async (item) => {
            const currency = order.payments
                ? order.payments[0]?.currency_code
                : undefined;
            const options: InternationalServiceabilityOptions = {
                pickup_postcode: stockLocation.address.postal_code,
                delivery_country:
                    order.shipping_address?.country_code ??
                    order.billing_address?.country_code,
                currency: currency ?? "USD",
                weight: item.variant.weight,
                cod: false
            };
            return await this.getInternationalServiceability(options);
        });

        const serviceabilityResult = await Promise.all(result);
        return serviceabilityResult;
    }

    async createNewPickupAddress(
        fulfillment: Fulfillment,
        pickUpLocationName: string
    ): Promise<ShiprocketResult> {
        try {
            const medusaStockLocation =
                await this.stockLocationService.retrieve(
                    fulfillment.location_id
                );
            try {
                const createLocationResult = await this.createPickUpLocation({
                    pickup_location: pickUpLocationName,
                    name: medusaStockLocation.address.company,
                    email: `${medusaStockLocation.address.phone}@${medusaStockLocation.address.company}.com`
                        .toLocaleLowerCase()
                        .replace(" ", "")
                        .trim(),
                    phone: medusaStockLocation.address.phone,
                    address: medusaStockLocation.address.address_1,
                    address_2: medusaStockLocation.address.address_2,
                    city: medusaStockLocation.address.city,
                    state: medusaStockLocation.address.province,
                    country: COUNTRY_CODES.filter((country) => {
                        return (
                            country.code ==
                            medusaStockLocation.address.country_code
                        );
                    })[0].name,
                    pin_code: medusaStockLocation.address.postal_code
                });
                const response =
                    createLocationResult.data as CreatePickupLocationResponse;
                return response.address[0];
            } catch (e) {
                this.logger.error(
                    `unable to create pickup location in shiprocket: ${e.message}`
                );
                return;
            }
        } catch (e) {
            this.logger.error(
                "unable to find pickup location in medusa" + e.message
            );
            return;
        }
    }

    async createOrderAtLocation(
        data: ShippingMethod,
        items: FulfillmentItem[],
        order: Order,
        fulfillment: Fulfillment,
        billing_address: Address,
        pickUpLocationName: string
    ): Promise<ShiprocketResult> {
        const pickupAddresses = await this.getPickupAddresses();

        const addresses = (pickupAddresses.data as PickupAddressesResponse).data
            .shipping_address;
        const pickUpAddress = addresses.filter((address) => {
            return address.pickup_location == pickUpLocationName;
        });
        if (pickUpAddress.length == 0) {
            const pickupLocation = await this.createNewPickupAddress(
                fulfillment,
                pickUpLocationName
            );
            if (!pickupLocation) {
                return {
                    status: false,
                    message: "No pickup location",
                    data: undefined
                };
            }
        }

        let totalWeight = 0;
        let maxLength = 0.5;
        let maxBreadth = 0.5;
        let maxHeight = 0.5;
        let sub_total = 0;
        let discount_sub_total = 0;

        items.map((item) => {
            totalWeight += item.item.variant.weight;
            maxLength =
                item.item.variant.length > maxLength
                    ? item.item.variant.length
                    : maxLength;
            maxBreadth =
                item.item.variant.width > maxBreadth
                    ? item.item.variant.length
                    : maxBreadth;
            maxHeight =
                item.item.variant.height > maxHeight
                    ? item.item.variant.length
                    : maxHeight;
            sub_total +=
                this.getPrice(
                    item.item.variant.prices,
                    order.cart.region.currency_code
                ).amount * item.item.quantity;
            discount_sub_total += item.item.discount_total;
        });

        const convertedItems = this.convertItems(
            items,
            order.cart.region.currency_code
        );
        order.shipping_address;
        const createOrderRequestOptions: CreateOrderRequestOptions = {
            channel_id: parseInt(this.options.channelId),
            order_id: order.id,
            order_date: order.created_at.toISOString(),
            comment: `Shipping ${order.id} from ${fulfillment.location_id}`,
            billing_address,
            shipping_is_billing: false,
            shipping_address: {
                ...order.shipping_address,
                email: billing_address.email,
                pincode: order.shipping_address.postal_code,
                state: order.shipping_address.province,
                address: order.shipping_address.address_1,
                country: order.shipping_address.country.name
            },
            order_items: convertedItems,
            pickup_location: pickUpLocationName,
            priceInfo: {
                discount: discount_sub_total,
                sub_total: sub_total,
                total_discount: discount_sub_total,
                shipping_charges: order.cart.shipping_total,
                giftwrap_charges: 0,
                transaction_charges: 0
            },
            payment_method: data.shipping_option_id.includes("cod")
                ? "COD"
                : "Prepaid",
            packageInfo: {
                length: maxLength,
                breadth: maxBreadth,
                height: maxHeight,
                weight: totalWeight
            }
        };
        const response = await this.requestCreateOrder(
            createOrderRequestOptions
        );
        fulfillment["shiprocket_order_id"] = response.data.order_id;
        return response;
    }

    cancelFulfillment(fulfillment: Fulfillment): Promise<ShiprocketResult> {
        return this.postShiprocketResultOfAction("/orders/cancel", {
            ids: [fulfillment.metadata.shiprocket_order_id]
        });
    }
    // eslint-disable-next-line valid-jsdoc
    /**
     * Used to calculate a price for a given shipping option.
     */
    calculatePrice(optionData: any, data: any, cart: any): number {
        return 0;
    }

    /**
     * Used to create a return order. Should return the data necessary for future
     * operations on the return; in particular the data may be used to receive
     * documents attached to the return.
     */
    /*
    createReturn(fromData: CreateReturnType): Promise<ShiprocketResult> {
        const shiprocket_order_id = fromData.metadata.shiprocket_order_id;
        return this.createReturnFromCustomerLocation(
            fromData.shipping_method,
            fromData.items,
            fromData.order,
            fromData.shipping_data.shipping_address as Address,
            fromData.shipping_data.shipping_customer_name as string
        );
    }

    async createReturnFromCustomerLocation(
        data: ShippingMethod,
        items: ReturnItem[],
        order: Order,
        address: Address,
        pickUplocation: string
    ): Promise<ShiprocketResult> {
        const locations = items.map((returnedItem) => returnedItem.item.order.fulfillments.filter(f=>
            f.items.map(i=>i.item_id).find())
        })
        const options: CreateReturnRequestOptions = {
            channel_id: this.options.channelId,
            order_id: order.id,
            order_date: order.created_at.toISOString(),

            pickup_address: address.address,

            pickup_address_2: address.address_2,
            pickup_city: address.city,
            pickup_state: address.state,
            pickup_country: address.country,
            pickup_pincode: address.pincode,
            pickup_email: address.email,
            pickup_phone: address.phone,
            pickup_isd_code: COUNTRY_CODES.filter(
                (c) => c.code == address.country
            )[0].dial_code,
            
            
            
            
            order_items: this.convertReturnItems(items),
            


            payment_method: "Prepaid",
            pickup_customer_name: `${order.customer.first_name} ${order.customer.last_name}`,
            pickup_last_name: `${order.customer.last_name}`,
            company_name: "",
            shipping_customer_name:,
            shipping_last_name: "",
            shipping_address: "",
            shipping_address_2: "",
            shipping_city: "",
            shipping_country: "",
            shipping_pincode: "",
            shipping_state: "",
            shipping_email: "",
            shipping_isd_code: "",
            shipping_phone: 0,
            total_discount: "",
            sub_total: 0,
            length: 0,
            breadth: 0,
            height: 0,
            weight: 0
        };
        const response = await this.requestCreateOrder(options);
        // fulfillment.metadata["shiprocket_order_id"] = response.data.order_id;
        return response;
    }

    /* registerInvoiceGenerator(service) {
        if (typeof service.createInvoice === "function") {
            this.invoiceGenerator_ = service;
        }
    }*/
    getOrders = (options?: {
        per_page?: number;
        page?: number;
        sort?: "ASC" | "DESC";
        sort_by?: string;
        to?: string;
        from?: string;
        filter?: string;
        filter_by?: string;
        search?: string;
        pickup_location?: string;
        orderId?: string | number;
    }): Promise<ShiprocketResult> => {
        if (options?.orderId) {
            const path = "/orders/show/" + options?.orderId;
            return this.getShiprocketResultOfAction(path);
        } else {
            const params = paramUrl(options);
            const path = "/orders?" + params;
            return this.getShiprocketResultOfAction(path);
        }
    };

    /**
     * Full fillment will need to be updated manually
     * @param shipment_id - the shipment to cancel
     * @returns ShiprocketResult
     */
    cancelShipment = async (
        shipment_id: string | string[]
    ): Promise<ShiprocketResult> => {
        return this.postShiprocketResultOfAction(
            "orders/cancel/shipment/awbs",
            {
                awbs: Array.isArray(shipment_id) ? shipment_id : [shipment_id]
            }
        );
    };

    /**
     * @param shipment_id string : e.g="432136546" Shipment Id to track
     * @return object
     */
    // get specific order
    getShipment = async (shipment_id: string): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/shipments/" + shipment_id);

    /**
     * @param shipment_id string : e.g="432136546" returns all shipments
     * @return object
     */
    // get specific order
    getAllShipments = async (): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/shipments/");

    /**
     * @param id string : e.g="432136546"
     * @return object
     */
    // get specific order
    getOrder = (id: string): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/orders/show/" + id);

    /**
     * @param options : { type: 'awb' | 'shipment' | 'Order Id, id: string }
     * @return object
     */
    // /get tracking data
    getTracking = (options: {
        type: "awb" | "shipment" | "orderId" | string;
        id: string | number;
    }): Promise<ShiprocketResult> => {
        if (options.type == "orderId") {
            return this.getShiprocketResultOfAction(
                `/courier/track?order_id=${options.id}`
            );
        }
        return this.getShiprocketResultOfAction(
            `/courier/track/${options.type}/${options.id}`
        );
    };
    // updateOrder = (options: orderOptions) => updateOrder({ auth: this.auth(), data: options });
    convertItems = (
        data: FulfillmentItem[],
        currency_code
    ): OrderItem[] | undefined => {
        if (data?.length) {
            const order_items = data.map((fulfillmentItem) => {
                const price = this.getPrice(
                    fulfillmentItem?.item.variant.prices,
                    currency_code
                );

                return {
                    sku: fulfillmentItem?.item.variant.id,
                    name: fulfillmentItem?.item.variant.title,
                    tax: fulfillmentItem.item.includes_tax
                        ? 0
                        : fulfillmentItem.item.tax_total ?? 0,
                    hsn: parseInt(
                        fulfillmentItem.item.variant.hs_code.replace(" ", "")
                    ),
                    units: fulfillmentItem?.quantity,
                    selling_price: price.amount,

                    discount: fulfillmentItem.item.discount_total
                        ? fulfillmentItem.item.discount_total
                        : 0
                };
            });

            return order_items;
        }

        return;
    };

    convertReturnItems = (
        data: ReturnItem[]
    ): OrderReturnItem[] | undefined => {
        if (data?.length) {
            const order_items: OrderReturnItem[] = data.map((returnItem) => ({
                sku: returnItem?.item.variant.id,
                name: returnItem?.item.variant.title,
                tax: returnItem.item.tax_lines[0].rate,
                hsn: returnItem.item.variant.hs_code.replace(" ", ""),
                units: returnItem?.quantity,
                selling_price: returnItem?.item.variant.prices[0].amount,
                discount: 0,
                qc_enable: true,
                brand: "",
                qc_size: `${returnItem?.quantity}`
            }));
            return order_items;
        }

        return;
    };

    /* createOrder = (
        options: CreateRequestOptions
    ): Promise<ShiprocketResult> => {
        const {
            comment,
            order_id,
            priceInfo,
            channel_id,
            pakageInfo,
            order_date,
            order_items,
            billing_address,
            shipping_address,
            payment_method,
            pickup_location,
            shipping_is_billing
        } = options;
        const request = {
            pickup_location,
            order_id,
            order_date,
            order_items: this.convertItems(order_items),
            shipping_is_billing,
            comment,
            channel_id,
            payment_method,
            ...priceInfo,
            ...pakageInfo,
            billing_customer_name: billing_address.first_name,
            billing_last_name: billing_address.last_name,
            billing_address: billing_address.address,
            billing_address_2: billing_address.address_2,
            billing_email: billing_address.email,
            billing_phone: billing_address.phone,
            billing_city: billing_address.city,
            billing_state: billing_address.state,
            billing_country: billing_address.country,
            billing_pincode: billing_address.pincode,
            shipping_customer_name: shipping_address?.first_name,
            shipping_last_name: shipping_address?.last_name,
            shipping_phone: shipping_address?.phone,
            shipping_email: shipping_address?.email,
            shipping_address: shipping_address?.address,
            shipping_address_2: shipping_address?.address_2,
            shipping_city: shipping_address?.city,
            shipping_state: shipping_address?.state,
            shipping_pincode: shipping_address?.pincode,
            shipping_country: shipping_address?.country
        };
        return this.requestCreateOrder(request);
    };
    
    updateOrder = (
        options: CreateRequestOptions
    ): Promise<ShiprocketResult> => {
        const {
            comment,
            order_id,
            priceInfo,
            channel_id,
            pakageInfo,
            order_date,
            order_items,
            billing_address,
            shipping_address,
            payment_method,
            pickup_location = "primary",
            shipping_is_billing = true
        } = options;
        const request = {
            pickup_location,
            order_id,
            order_date,
            order_items: this.converItems(order_items),
            shipping_is_billing,
            comment,
            channel_id,
            payment_method,
            ...priceInfo,
            ...pakageInfo,
            billing_customer_name: billing_address.first_name,
            billing_last_name: billing_address.last_name,
            billing_address: billing_address.address,
            billing_address_2: billing_address.address_2,
            billing_email: billing_address.email,
            billing_phone: billing_address.phone,
            billing_city: billing_address.city,
            billing_state: billing_address.state,
            billing_country: billing_address.country,
            billing_pincode: billing_address.pincode,
            shipping_customer_name: shipping_address?.first_name,
            shipping_last_name: shipping_address?.last_name,
            shipping_phone: shipping_address?.phone,
            shipping_email: shipping_address?.email,
            shipping_address: shipping_address?.address,
            shipping_address_2: shipping_address?.address_2,
            shipping_city: shipping_address?.city,
            shipping_state: shipping_address?.state,
            shipping_pincode: shipping_address?.pincode,
            shipping_country: shipping_address?.country
        };
        return this.requestCreateOrder(request);
    };
    */
    getProducts = (options?: {
        per_page?: number;
        page?: number;
        sort?: "ASC" | "DESC";
        sort_by?: string;
        filter?: string;
        filter_by?: string;
        productId?: string | number;
    }): Promise<ShiprocketResult> => {
        if (options?.productId) {
            const path = "/products/show/" + options?.productId;
            return this.getShiprocketResultOfAction(path);
        } else {
            const path = "/products?" + paramUrl(options);
            return this.getShiprocketResultOfAction(path);
        }
    };

    getCountries = (countryId?: string | number): Promise<ShiprocketResult> => {
        if (countryId) {
            return this.getShiprocketResultOfAction(
                "/countries/show/" + countryId
            );
        } else {
            return this.getShiprocketResultOfAction("/countries");
        }
    };
    getAllZones = (countryId: string | number): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/countries/show/" + countryId);

    getDiscrepancy = (): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/billing/discrepancy");
    checkImport = (importId: string | number): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction(`/errors/${importId}/check`);

    getLists = (options?: {
        per_page?: number;
        page?: number;
        sort?: "ASC" | "DESC";
        sort_by?: string;
        filter?: string;
        filter_by?: string;
    }): Promise<ShiprocketResult> => {
        const path = "/listings?" + paramUrl(options);
        return this.getShiprocketResultOfAction(path);
    };
    /**
     * @param id required (string)
     * @returns object
     */
    getProduct = (id: string | number): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/products/show/" + id);

    addProduct = (data: ProductOptions): Promise<ShiprocketResult> =>
        this.postShiprocketResultOfAction("/products", data);

    // get locality
    /**
     * @param pincode required (number | string)
     * @returns object
     */
    getLocality = (pincode: number | string): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction(
            `/open/postcode/details?postcode=${pincode}`
        );

    getServiceability = (
        options: ServiceabilityOptions
    ): Promise<ShiprocketResult> => {
        const {
            pickup_pincode,
            delivery_pincode,
            cod,
            weight,
            height,
            breadth,
            mode,
            is_return,
            price,
            orderId
        } = options;
        const params = {
            pickup_postcode: pickup_pincode,
            delivery_postcode: delivery_pincode,
            cod: cod == true ? 1 : 0,
            height,
            weight,
            is_return,
            mode,
            breadth,
            orderId,
            declare_value: price
        };
        const path = "/courier/serviceability?" + paramUrl(params);
        return this.getShiprocketResultOfAction(path);
    };

    /**
     *
     * @param shipment_id - the shipment id to pickup
     * @param pickupDates  - the date to pickup on
     * @param retry - "if retry"
     * @returns
     */

    createPickupRequest = async (
        fulfillment_id: string,
        shipment_id: string,
        pickupDates: /** yyyy-mm-dd format */ string | string[],
        retry?: "retry"
    ): Promise<ShiprocketResult> => {
        const data = {
            shipment_id: shipment_id,
            pickup_date: Array.isArray(pickupDates)
                ? pickupDates
                : [pickupDates]
        };

        const result = await this.postShiprocketResultOfAction(
            "/courier/generate/pickup",
            retry ? { ...data, retry } : data
        );

        await this.updateFulfillment(
            fulfillment_id,
            result,
            "pickup",
            shipment_id
        );

        return result;
    };
    getInternationalServiceability = (
        options: InternationalServiceabilityOptions
    ): Promise<ShiprocketResult> => {
        const { pickup_postcode, delivery_country, cod, weight, orderId } =
            options;
        const params = {
            pickup_postcode: pickup_postcode,
            delivery_country,
            cod: cod != true ? 1 : 0,
            weight,
            orderId
        };
        const path =
            "/courier/international/serviceability?" + paramUrl(params);
        return this.getShiprocketResultOfAction(path);
    };
    // get statements
    getStatements = (options?: {
        per_page?: number;
        page?: number;
        to?: string;
        from?: string;
    }): Promise<ShiprocketResult> => {
        const path = "/account/details/statement?" + paramUrl(options);
        return this.getShiprocketResultOfAction(path);
    };

    // /get wallet balance
    getWalletBalance = (): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/account/details/wallet-balance");
    // /get channels
    getChannels = (): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("/channels");
    getPickupAddresses = (): Promise<ShiprocketResult> =>
        this.getShiprocketResultOfAction("settings/company/pickup");

    getNDR = (options?: {
        per_page?: number;
        page?: number;
        to?: string;
        from?: string;
        search?: awb_number;
        awb?: string;
    }): Promise<ShiprocketResult> => {
        if (options?.awb) {
            return this.getShiprocketResultOfAction("/ndr/show/" + options.awb);
        } else {
            const path = "/ndr/all?" + paramUrl(options);
            return this.getShiprocketResultOfAction(path);
        }
    };

    async postQuickCreateForward(
        fulfillment_id: string,
        data: QuickForwardRequest
    ): Promise<ShiprocketResult> {
        const result = await this.postShiprocketResultOfAction(
            "shipments/create/forward-shipment",
            data
        );
        await this.updateFulfillment(fulfillment_id, result);
        return result;
    }

    async postQuickReturn(data: QuickReturnRequest): Promise<ShiprocketResult> {
        return await this.postShiprocketResultOfAction(
            "shipments/create/forward-shipment",
            data
        );
    }

    async getShiprocketResultOfAction(path: string): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.get(path);
            const { status, data } = this.validateData(result);
            if (!status) {
                throw new Error(data.message);
            }

            const response = {
                status: true,
                data,
                message: "Request Executed Successfully"
            };
            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async postShiprocketResultOfAction(
        path: string,
        postData: any
    ): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post(path, postData);
            const { status, data } = this.validateData(result);
            if (!status) {
                throw new Error(data.message);
            }

            const response = {
                status: true,
                data,
                message: "Request Executed Successfully"
            };
            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async patchShiprocketResultOfAction(
        path: string[],
        patchData: any
    ): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.patch(path[0], patchData);
            const { status, data } = this.validateData(result);
            if (!status) {
                throw new Error(data.message);
            }

            const response = {
                status: true,
                data,
                message: "Request Executed Successfully"
            };
            return response;
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }
}

const paramUrl = (options?: object): string => {
    if (options && typeof options == "object") {
        const params = Object.entries(options)
            .map(([key, vlaue]) => `${key}=${vlaue}`)
            .join("&");
        return params;
    }
    return "";
};

export default ShiprocketProviderService;
