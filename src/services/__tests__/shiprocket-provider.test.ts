import ShiprocketProviderService, {
    ShiprocketResult
} from "../shiprocket-provider";
import { MockManager, MockRepository, IdMap } from "medusa-test-utils";
import { dummyRequest } from "../__fixtures__/dummy";
import logger from "../__mocks__/logger";
import dotenv from "dotenv";
import {
    CreatePickupLocationRequest,
    CreateOrderRequestOptions,
    InternationalServiceabilityOptions,
    ServiceabilityOptions,
    CreateOrderResponse
} from "types/globals";
import {
    Fulfillment,
    FulfillmentItem,
    Item,
    StockLocationDTO
} from "@medusajs/medusa";
import { orders } from "../__mocks__/order";
dotenv.config();

const shiprocketUserName = process.env.SHIPROCKET_USERNAME ?? "test";
const shiprocketPassword = process.env.SHIPROCKET_PASSWORD ?? "test";
const shiprocketChannelID = process.env.SHIPROCKET_CHANNEL_ID ?? "123456";
let shiprocket: ShiprocketProviderService;

const mock = {
    orderService: {
        createShipment: jest.fn()
    },
    swapService: {
        createShipment: jest.fn()
    },
    claimService: {
        createShipment: jest.fn()
    },
    jobSchedulerService: {
        create: jest.fn()
    },
    logger: logger,
    userService: jest.fn(),
    totalsService: jest.fn(),
    shippingProfileService: jest.fn(),
    fulfillmentService: jest.fn(),
    lineItemService: jest.fn(),
    fulfillmentProviderService: jest.fn(),
    fulfillmentRepository: MockRepository(),
    trackingLinkRepository: MockRepository(),
    lineItemRepository: MockRepository(),
    productVariantInventoryService: jest.fn(),
    stockLocationService: {
        retrieve: jest.fn().mockImplementation(() => {
            const result: StockLocationDTO = {
                id: IdMap.getId("test-stock-location"),
                name: "test-location",
                metadata: undefined,
                address: {
                    id: IdMap.getId("test-stock-location-address"),
                    address_1: "test-location",
                    address_2: "test-location-2",
                    company: "test-company",
                    country_code: "IN",
                    city: "kochi",
                    phone: "9876543210",
                    postal_code: "682001",
                    province: "kerala",

                    created_at: Date().toString(),
                    updated_at: Date().toString(),
                    deleted_at: Date().toString()
                },
                address_id: IdMap.getId("test-stock-location-address"),
                created_at: Date().toString(),
                updated_at: Date().toString(),
                deleted_at: Date().toString()
            };
            return Promise.resolve(result);
        })
    },

    eventBusService: {
        emit: jest.fn().mockReturnValue(Promise.resolve())
    }
};
describe("ShiprocketFullfillmentService", () => {
    beforeAll(() => {
        shiprocket = new ShiprocketProviderService(
            {
                logger: console as any,
                eventBusService: mock.eventBusService as any,
                jobSchedulerService: mock.jobSchedulerService as any,
                manager: MockManager,

                totalsService: mock.totalsService as any,
                shippingProfileService: mock.shippingProfileService as any,
                lineItemService: mock.lineItemService as any,
                fulfillmentProviderService:
                    mock.fulfillmentProviderService as any,
                orderService: mock.orderService as any,
                fulfillmentRepository: mock.fulfillmentRepository,

                trackingLinkRepository: mock.trackingLinkRepository,
                lineItemRepository: mock.lineItemRepository,
                productVariantInventoryService:
                    mock.productVariantInventoryService as any,

                claimService: mock.claimService as any,
                swapService: mock.swapService as any,
                userService: mock.userService as any,
                stockLocationService: mock.stockLocationService as any,
                fulfillmentService: mock.fulfillmentService as any
            },
            {
                shiprocket_url: "https://apiv2.shiprocket.in/v1/external",
                channelId: shiprocketChannelID,
                shiprocket_username: shiprocketUserName,
                shiprocket_password: shiprocketPassword,
                enable_next_day_pickup: true
            }
        );
    });
    describe("handleWebhook", () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it("login to shiprocket", async () => {
            const loginResult = await shiprocket.login();
            expect(loginResult.data.token).toBeDefined();
            expect(loginResult.data.token.length > 0).toBeTruthy();
            shiprocket.configureAxiosInstance(loginResult);
        });

        it("test serviceability domestic", async () => {
            const serviceabilityOptions: ServiceabilityOptions = {
                pickup_pincode: "682016",
                delivery_pincode: "110011",
                cod: false,
                weight: 10,
                height: 10,
                mode: "Surface"
            };
            const result = await shiprocket.getServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(true);
        }, 90e3);

        it("test serviceability domestic air", async () => {
            const serviceabilityOptions: ServiceabilityOptions = {
                pickup_pincode: "682016",
                delivery_pincode: "110011",
                cod: false,
                weight: 10,
                height: 10,
                mode: "Air"
            };
            const result = await shiprocket.getServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(true);
        }, 90e3);

        it("test serviceability domestic -cod -surface", async () => {
            const serviceabilityOptions: ServiceabilityOptions = {
                pickup_pincode: "682016",
                delivery_pincode: "110011",
                cod: true,
                weight: 10,
                height: 10,
                mode: "Surface"
            };
            const result = await shiprocket.getServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(true);
        }, 90e3);

        it("test serviceability domestic cod - air", async () => {
            const serviceabilityOptions: ServiceabilityOptions = {
                pickup_pincode: "682016",
                delivery_pincode: "110011",
                cod: true,
                weight: 10,
                height: 10,
                mode: "Air"
            };
            const result = await shiprocket.getServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(true);
        }, 90e3);

        it("test serviceability international - USD", async () => {
            const serviceabilityOptions: InternationalServiceabilityOptions = {
                pickup_postcode: "682016",
                currency: "USD",
                delivery_country: "US",
                cod: false,
                weight: 10
            };
            const result = await shiprocket.getInternationalServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(true);
        }, 90e3);

        it("test serviceability international - EUR", async () => {
            const serviceabilityOptions: InternationalServiceabilityOptions = {
                pickup_postcode: "682016",
                currency: "EUR",
                delivery_country: "FR",
                cod: false,
                weight: 10
            };
            const result = await shiprocket.getInternationalServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(true);
        }, 90e3);

        it("test serviceability international - GBP  - wrong code", async () => {
            const serviceabilityOptions: InternationalServiceabilityOptions = {
                pickup_postcode: "682016",
                currency: "GBP",
                delivery_country: "UK",
                cod: false,
                weight: 10
            };
            const result = await shiprocket.getInternationalServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(false);
        }, 90e3);
        it("test serviceability international - GBP  - correct code", async () => {
            const serviceabilityOptions: InternationalServiceabilityOptions = {
                pickup_postcode: "682016",
                currency: "GBP",
                delivery_country: "GB",
                cod: false,
                weight: 10
            };
            const result = await shiprocket.getInternationalServiceability(
                serviceabilityOptions
            );
            expect(result.status).toBe(true);
        }, 90e3);

        it("test check order serviceability - domestic", async () => {
            const order = orders.testOrderIndiaDomestic;
            let result;
            for (let i = 0; i < 4; i++) {
                result = await shiprocket.checkServiceability(
                    order as any,
                    {
                        id: IdMap.getId(shiprocket.fulfillmentTypes[i]),
                        shipping_option_id: shiprocket.fulfillmentTypes[i]
                    } as any,
                    false
                );
                expect(result.length > 0).toBe(true);
                result.map((r) => {
                    r.serviceability.map((s) => {
                        expect(s.status).toBe(true);
                    });
                });
            }
        }, 90e3);
        it("test check order serviceability - international", async () => {
            const order = orders.testOrderIntlDif;

            const result = await shiprocket.checkServiceability(
                order as any,
                {
                    id: IdMap.getId(shiprocket.fulfillmentTypes[3]),
                    shipping_option_id: shiprocket.fulfillmentTypes[3]
                } as any,
                false
            );
            expect(result.length > 0).toBe(true);
            result.map((r) => {
                r["serviceability"].map((s) => {
                    expect(s.status).toBe(true);
                });
            });
            const addressResult = await shiprocket.getPickupAddresses();
            expect(addressResult.status).toBe(true);
        }, 90e3);

        it("test create pickup locations", async () => {
            const testRequest: CreatePickupLocationRequest = {
                pickup_location: IdMap.getId("test-location"),
                name: "test" + IdMap.getId("test-location"),
                email: "test@test.com",
                phone: "9876543210" /** needs to be 10 digits.  */,
                address:
                    "123 abcdefghijklmnopqrstuvwxyz" /** must contain number */,
                address_2: "abcdefghijklmnopqrstuvwxyz",
                city: "mumbai",
                state: "maharashtra",
                country: "India",
                pin_code: "400093"
            };

            const result = await shiprocket.createPickUpLocation(testRequest);
            expect(result.status).toBe(true);
            const addressResult = await shiprocket.getPickupAddresses();
            expect(addressResult.status).toBe(true);
            expect(
                addressResult.data.data.shipping_address.filter(
                    (a) => a.pickup_location == IdMap.getId("test-location")
                ).length == 1
            ).toBe(true);
        }, 90e3);
        it("test create order - domestic", async () => {
            const order = orders.testOrderIndiaDomestic;
            const fulfillment = {
                location_id: IdMap.getId("test-location"),
                provider_id: "shiprocket",
                id: IdMap.getId("test-fulfillment")
            } as any;
            const result = await shiprocket.createFulfillment(
                {
                    id: IdMap.getId(shiprocket.fulfillmentTypes[0]),
                    shipping_option_id: shiprocket.fulfillmentTypes[0]
                } as any,
                order.items.map((item) => {
                    const fulfillmentItem: FulfillmentItem = {
                        fulfillment_id: fulfillment.id,
                        item_id: item.id,
                        fulfillment: fulfillment,
                        item: item as any,
                        quantity: item.quantity
                    };
                    return fulfillmentItem;
                }),
                order as any,
                fulfillment
            );
            result.map(async (r: ShiprocketResult) => {
                expect(r.status).toBe(true);
                const response = r.data as CreateOrderResponse;
                const deleteResult = await shiprocket.deleteOrder(
                    response.order_id,
                    r.data.fulfillment_id
                );
                expect(deleteResult.status).toBe(true);
            });
        }, 90e3);
        it("test forward full-chain", async () => {
            const order = orders.testOrderIndiaDomestic;
            const fulfillment = {
                location_id: IdMap.getId("test-location"),
                provider_id: "shiprocket",
                id: IdMap.getId("test-fulfillment")
            } as any;
            const result = await shiprocket.createFulfillment(
                {
                    id: IdMap.getId(shiprocket.fulfillmentTypes[0]),
                    shipping_option_id: shiprocket.fulfillmentTypes[0]
                } as any,
                order.items.map((item) => {
                    const fulfillmentItem: FulfillmentItem = {
                        fulfillment_id: fulfillment.id,
                        item_id: item.id,
                        fulfillment: fulfillment,
                        item: item as any,
                        quantity: item.quantity
                    };
                    return fulfillmentItem;
                }),
                order as any,
                fulfillment
            );
            const forwardingResult = await shiprocket.generateAllAwb(
                IdMap.getId("test-fulfillment"),
                result
            );
            expect(forwardingResult.length).toBeTruthy();
            forwardingResult.map(async (r: ShiprocketResult, index) => {
                expect(r.status).toBe(true);
                const response = r.data as CreateOrderResponse;
                const deleteResult = await shiprocket.deleteOrder(
                    response.order_id,
                    result[index].data.fulfillment_id
                );
                expect(deleteResult.status).toBe(true);
            });
        }, 90e3);
    });
});
