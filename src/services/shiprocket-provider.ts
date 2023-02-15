import { EntityManager } from "typeorm";
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
    Item,
    ShippingOption
} from "@medusajs/medusa";
import { IStockLocationService } from "@medusajs/medusa";
import { FulfillmentService } from "medusa-interfaces";
import { FulfillmentRepository } from "@medusajs/medusa/dist/repositories/fulfillment";
import { LineItemRepository } from "@medusajs/medusa/dist/repositories/line-item";
import { TrackingLinkRepository } from "@medusajs/medusa/dist/repositories/tracking-link";
import {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    default as axios
} from "axios";
import RandExp from "randexp";
import JobSchedulerService from "@medusajs/medusa/dist/services/job-scheduler";
import {
    Address,
    awb_number,
    CreatePickupLocationRequest,
    CreatePickupLocationResponse,
    CreateRequestOptions,
    CreateReturnRequestOptions,
    InternationalServiceabilityOptions,
    OrderItem,
    OrderReturnItem,
    PickupAddressesResponse,
    ProductOptions,
    ServiceabilityOptions
} from "../types/globals";
import { createPackageValidator } from "../api/controllers/package/v1/package-validator-utilts";
import { ChannelSettings } from "../types/channel";
import { COUNTRY_CODES } from "../utils/country";
import { QuickForwardRequest } from "../types/quick-ship";

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
            headers: {
                "content-type": "application/json",
                "Authorization": `Bearer ${this.token}`
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

            return {
                status: true,
                message: "Auth token fetched!",
                data: result.data
            };
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
                pin_code
            } = request;

            const result = await this.axiosInstance.post(
                "settings/company/addpickup",
                {
                    pickup_location: new RandExp(/^[A-Z0-9]{8}$/).gen(),
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

            const {
                data: { message }
            } = response;

            return {
                status: false,
                data: null,
                message: message || "Unable to register address"
            };
        }
    }

    async requestCreateOrder(request): Promise<ShiprocketResult> {
        try {
            const {
                order_id,
                order_date,
                pickup_location,
                channel_id,
                comment,
                billing_customer_name,
                billing_last_name,
                billing_address,
                billing_address_2,
                billing_city,
                billing_pincode,
                billing_state,
                billing_country,
                billing_email,
                billing_phone,
                shipping_is_billing,
                order_items,
                payment_method,
                shipping_charges,
                giftwrap_charges,
                transaction_charges,
                total_discount,
                sub_total,
                length,
                breadth,
                height,
                weight
            } = request;

            const result = await this.axiosInstance.post(
                "orders/create/adhoc",
                {
                    order_id,
                    order_date,
                    pickup_location,
                    channel_id,
                    comment,
                    billing_customer_name,
                    billing_last_name,
                    billing_address,
                    billing_address_2,
                    billing_city,
                    billing_pincode,
                    billing_state,
                    billing_country,
                    billing_email,
                    billing_phone,
                    shipping_is_billing,
                    order_items,
                    payment_method,
                    shipping_charges,
                    giftwrap_charges,
                    transaction_charges,
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

            return {
                status: true,
                data,
                message: "Pickup request placed successfully!"
            };
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

            return {
                status: true,
                data,
                message: "Pickup request placed successfully!"
            };
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async generateAWB(shipment_id): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post("courier/assign/awb", {
                shipment_id,
                courier_id: ""
            });

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            const returnData = data.response.data;

            returnData.awb_assign_status = data.awb_assign_status;

            return {
                status: true,
                data: returnData,
                message: "AWB assigned successfully!"
            };
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async generateLabel(shipment_id): Promise<ShiprocketResult> {
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

            return {
                status: true,
                data: label_url,
                message: "Label generated successfully!"
            };
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async generateInvoice(ids): Promise<ShiprocketResult> {
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

            return {
                status: true,
                data: invoice_url,
                message: "Invoice generated successfully!"
            };
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async shipmentPickUp(shipment_id): Promise<ShiprocketResult> {
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

            return { status: true, data: returnData, message };
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async generateManifests(shipment_id: string): Promise<ShiprocketResult> {
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

            return {
                status: true,
                data: manifest_url,
                message: "Manifest generated successfully!"
            };
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async printManifests(order_ids): Promise<ShiprocketResult> {
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

            return {
                status: true,
                data: manifest_url,
                message: "Manifest generated successfully!"
            };
        } catch (error) {
            const message = this.parseError(error);

            return { status: false, data: null, message };
        }
    }

    async deleteOrder(ids): Promise<ShiprocketResult> {
        try {
            const result = await this.axiosInstance.post("orders/cancel", {
                ids
            });

            const { status, data } = this.validateData(result);

            if (!status) {
                throw new Error(data.message);
            }

            if (data.prototype.hasOwnProperty.call("status_code")) {
                throw new Error(data.message);
            }

            return {
                status: true,
                data: true,
                message: "Orders cancelled successfully!"
            };
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

    parseError(error): string {
        try {
            const { response } = error;

            if (!response) {
                throw new Error(error.message);
            }

            const {
                data: { message }
            } = response;

            return message || "Error while operating!";
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
                cart.billing_address.country.iso_2 == "IN" &&
                (optionData.id != this.fulfillmentTypes[0] ||
                    optionData.id != this.fulfillmentTypes[1] ||
                    optionData.id != this.fulfillmentTypes[2] ||
                    optionData.id != this.fulfillmentTypes[3])
            ) {
                throw new Error("Invalid shipping option selected");
            }

            if (
                cart.billing_address.country.iso_2 != "IN" &&
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
            country: order.billing_address.country.iso_2,
            address: order.billing_address.address_1,
            address_2: order.billing_address.address_2
        };
        const locations = items.map((item) => item.fulfillment.location_id);
        const result = locations.map(async (pickUplocation) => {
            const itemsAtLocation = items.filter(
                (item) => item.fulfillment.location_id == pickUplocation
            );

            return await this.createOrderAtLocation(
                shippingMethod,
                itemsAtLocation,
                order,
                fulfillment,
                billing_address,
                pickUplocation
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

            const delivery_country_code = order.shipping_address.country_code;
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
                delivery_pincode: order.shipping_address.postal_code,
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
                delivery_country: order.shipping_address.country_code,
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

        const options: CreateRequestOptions = {
            channel_id: parseInt(this.options.channelId),
            order_id: order.id,
            order_date: order.created_at.toISOString(),

            billing_address,
            order_items: this.convertItems(items),
            pickup_location: pickUpLocationName,
            priceInfo: {
                discount: 0,
                sub_total: 0,
                total_discount: 0,
                shipping_charges: 0,
                giftwrap_charges: 0,
                transaction_charges: 0
            },
            payment_method: "Prepaid",
            pakageInfo: {
                length: 0,
                breadth: 0,
                height: 0,
                weight: 0
            }
        };
        const response = await this.requestCreateOrder(options);
        fulfillment.metadata["shiprocket_order_id"] = response.data.order_id;
        return response;
    }

    cancelFulfillment(fulfillment: Fulfillment): Promise<ShiprocketResult> {
        return this.postShiprocketResultOfAction("/orders/cancel", {
            id: fulfillment.metadata.shiprocket_order_id
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
    convertItems = (data: FulfillmentItem[]): OrderItem[] | undefined => {
        if (data?.length) {
            const order_items: OrderItem[] = data.map((fulfillmentItem) => ({
                sku: fulfillmentItem?.item.variant.id,
                name: fulfillmentItem?.item.variant.title,
                tax: fulfillmentItem.item.tax_lines[0].rate,
                hsn: parseInt(
                    fulfillmentItem.item.variant.hs_code.replace(" ", "")
                ),
                units: fulfillmentItem?.quantity,
                selling_price: fulfillmentItem?.item.variant.prices[0].amount,
                discount: 0
            }));
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
        data: QuickForwardRequest
    ): Promise<ShiprocketResult> {
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

            return {
                status: true,
                data,
                message: "Request Executed Successfully"
            };
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

            return {
                status: true,
                data,
                message: "Request Executed Successfully"
            };
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

            return {
                status: true,
                data,
                message: "Request Executed Successfully"
            };
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
