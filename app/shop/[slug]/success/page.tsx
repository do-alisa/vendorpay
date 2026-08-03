import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function SuccessPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ session_id?: string }>;
}) {
    const { slug } = await params;
    const { session_id } = await searchParams;

    if (!session_id) notFound();

    const session = await stripe.checkout.sessions.retrieve(session_id);

    const payment = await prisma.payment.findUnique({
        where: { stripePaymentId: session_id },
        include: { order: { include: { orderItems: { include: { product: true } } } } },
    });

    return (
        <div className="min-h-screen max-w-md mx-auto p-6 text-center">
            <div className="mt-12 mb-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✓</span>
                </div>
                <h1 className="text-2xl font-bold">Payment Successful</h1>
                {payment && (
                    <p className="text-gray-500 mt-1">Order #{payment.order.id.slice(-6).toUpperCase()}</p>
                )}
            </div>

            {payment ? (
                <div className="text-left border rounded-lg p-4 space-y-2">
                    {payment.order.orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                            <span>
                                {item.quantity}× {item.product.name}
                            </span>
                            <span>${(parseFloat(item.price.toString()) * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span>${payment.amount.toString()}</span>
                    </div>
                </div>
            ) : (
                <p className="text-gray-500 text-sm">
                    Payment received — your receipt is being prepared. This can take a few seconds; refresh
                    if you don't see order details yet.
                </p>
            )}
        </div>
    );
}