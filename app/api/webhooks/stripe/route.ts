import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Stripe from "stripe";

export async function POST(req: Request) {
    const body = await req.text();
    const headerPayload = await headers();
    const signature = headerPayload.get("stripe-signature");

    if (!signature) {
        return new Response("Missing signature", { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response("Invalid signature", { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        const vendorId = session.metadata?.vendorId;
        const itemsJson = session.metadata?.items;

        if (!vendorId || !itemsJson) {
            console.error("Missing metadata on checkout session");
            return new Response("Missing metadata", { status: 400 });
        }

        const items: { productId: string; quantity: number }[] = JSON.parse(itemsJson);

        // Avoid creating duplicate orders if Stripe retries the webhook delivery
        const existingPayment = await prisma.payment.findUnique({
            where: { stripePaymentId: session.id },
        });
        if (existingPayment) {
            return new Response("Already processed", { status: 200 });
        }

        // Re-fetch current product data so prices/names are accurate at fulfillment time
        const products = await prisma.product.findMany({
            where: { id: { in: items.map((i) => i.productId) } },
        });

        const total = (session.amount_total ?? 0) / 100; // Stripe amounts are in cents

        await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    vendorId,
                    total,
                    status: "PENDING",
                    orderItems: {
                        create: items.map((item) => {
                            const product = products.find((p) => p.id === item.productId)!;
                            return {
                                productId: item.productId,
                                quantity: item.quantity,
                                price: product.price,
                            };
                        }),
                    },
                },
            });

            await tx.payment.create({
                data: {
                    orderId: order.id,
                    stripePaymentId: session.id,
                    amount: total,
                    status: "SUCCEEDED",
                    paymentMethod: "CARD", // Stripe Checkout doesn't tell us the exact method here without extra API calls; refined in a later phase if needed
                },
            });

            // Decrement stock for each purchased item
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
            }
        });
    }

    return new Response("OK", { status: 200 });
}