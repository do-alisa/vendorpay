import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OrdersList from "@/components/orders-list";

export default async function OrdersPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const vendor = await prisma.vendor.findUnique({ where: { ownerId: userId } });
    if (!vendor) redirect("/onboarding");

    const orders = await prisma.order.findMany({
        where: { vendorId: vendor.id },
        include: { orderItems: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
    });

    const serializedOrders = orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: order.total.toString(),
        createdAt: order.createdAt.toISOString(),
        items: order.orderItems.map((item) => ({
            id: item.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price.toString(),
        })),
    }));

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Orders</h1>
            <OrdersList initialOrders={serializedOrders} vendorId={vendor.id} />
        </div>
    );
}