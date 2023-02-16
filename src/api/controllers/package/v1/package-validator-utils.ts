export function createPackageValidator(data) {
    const {
        orderId,
        orderDate,
        pickupLocation,
        comment,
        billingCustomerName,
        billingLastName,
        billingAddress,
        billingAddressTwo,
        billingCity,
        billingPincode,
        billingState,
        billingCountry,
        billingEmail,
        billingPhone,
        orderItems,
        paymentMethod,
        shippingCharges,
        giftWrapCharges,
        transactionCharges,
        totalDiscount,
        subTotal,
        length,
        breadth,
        height,
        weight
    } = data;

    if (!orderId) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid order Id!" })
        );
    }

    if (!orderDate) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid order date!" })
        );
    }

    if (!pickupLocation) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid pick location!" })
        );
    }

    if (!comment) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid comment!" })
        );
    }

    if (!billingCustomerName) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid customer name!" })
        );
    }

    if (!billingLastName) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer last name!"
            })
        );
    }

    if (!billingAddress) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer address!"
            })
        );
    }

    if (!billingCity) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid customer city!" })
        );
    }

    if (!billingPincode) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer pincode!"
            })
        );
    }

    if (billingPincode.length !== 6) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer pincode!"
            })
        );
    }

    if (!billingState) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer state!"
            })
        );
    }

    if (!billingCountry) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer country!"
            })
        );
    }

    if (!billingState) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer state!"
            })
        );
    }

    if (!billingEmail) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer email!"
            })
        );
    }

    if (!billingPhone) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid customer phone!"
            })
        );
    }

    const validPhone = global.phoneUtil.parseAndKeepRawInput(
        billingPhone,
        process.env.COUNTRY_CODE
    );

    if (!validPhone) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid phone!" })
        );
    }

    if (!orderItems) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid orders!" })
        );
    }

    if (orderItems.length <= 0) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid orders!" })
        );
    }

    if (!paymentMethod) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid payment methods!"
            })
        );
    }

    if (!["Prepaid", "Postpaid"].includes(paymentMethod)) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid payment methods!"
            })
        );
    }

    /* // if(!shippingCharges) throw new Error(
            JSON.stringify({code: 409,  message: 'Invalid shipping charges!' }));

// if(!giftWrapCharges) throw new Error(
            JSON.stringify({code: 409,  message: 'Invalid gift-wrap charges!' };

// if(!transactionCharges) throw new Error(
            JSON.stringify({code: 409,  message: 'Invalid transaction charges!' };

// if(!totalDiscount) throw new Error(
            JSON.stringify({code: 409,  message: 'Invalid transaction charges!' };
*/
    if (!subTotal) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid sub-total charges!"
            })
        );
    }

    if (!length) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid package length!"
            })
        );
    }

    if (!breadth) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid package breadth!"
            })
        );
    }

    if (!height) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid package height!"
            })
        );
    }

    if (!weight) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: "Invalid package weight!"
            })
        );
    }
}

export function packageOrderValidator(data) {
    const { name, sku, units, sellingPrice, discount, tax, hsn } = data;

    if (!sku) {
        throw new Error(
            JSON.stringify({ code: 409, message: "Invalid order sku" })
        );
    }

    if (!name) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: `SKU-${sku}: Invalid order name`
            })
        );
    }

    if (!units) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: `SKU-${sku}: Invalid order units`
            })
        );
    }

    if (!sellingPrice) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: `SKU-${sku}: Invalid order selling price`
            })
        );
    }

    /* if(!discount) throw new Error(
                    JSON.stringify({code: 409, message: `SKU-${sku}: Invalid  order discount` };*/

    if (!tax) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: `SKU-${sku}: Invalid order tax`
            })
        );
    }

    if (!hsn) {
        throw new Error(
            JSON.stringify({
                code: 409,
                message: `SKU-${sku}: Invalid order hsn`
            })
        );
    }
}

export function listOrValueValidator(listIds: [], listType: string) {
    if (!listIds) {
        throw new Error(
            JSON.stringify({ code: 409, message: `Invalid ${listType} ids` })
        );
    }

    if (!Array.isArray(listIds)) {
        throw new Error(
            JSON.stringify({ code: 409, message: `Invalid ${listType}  ids` })
        );
    }

    if (listIds.length <= 0) {
        throw new Error(
            JSON.stringify({ code: 409, message: `Invalid ${listType}  ids` })
        );
    }
}
