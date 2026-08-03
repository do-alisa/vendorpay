"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

type CheckoutItem = {
    productId: string;
    quantity: number;
};

export async function createCheckoutSession(vendorId: string, items: CheckoutItem[]) {
    if (items.length === 0) {
        throw new Error("Cart is empty");
    }

    // Re-fetch prices from the DB server-side — never trust prices sent from the client
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, vendorId, isAvailable: true },
    });

    if (products.length !== items.length) {
        throw new Error("One or more items are no longer available");
    }

    const lineItems = items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: product.name,
                    images: product.image ? [product.image] : undefined,
                },
                unit_amount: Math.round(parseFloat(product.price.toString()) * 100), // Stripe wants cents
            },
            quantity: item.quantity,
        };
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new Error("Vendor not found");

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: `${baseUrl}/shop/${vendor.qrCode}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/shop/${vendor.qrCode}`,
        metadata: {
            vendorId: vendor.id,
            items: JSON.stringify(items), // used by the webhook to build the Order/OrderItems
        },
    });

    return { url: session.url };
}