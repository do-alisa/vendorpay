"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getVendorForCurrentUser() {
    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");

    const vendor = await prisma.vendor.findUnique({ where: { ownerId: userId } });
    if (!vendor) throw new Error("No vendor profile found");

    return vendor;
}

export async function updateOrderStatus(
    orderId: string,
    status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
) {
    const vendor = await getVendorForCurrentUser();

    await prisma.order.updateMany({
        where: { id: orderId, vendorId: vendor.id },
        data: { status },
    });

    revalidatePath("/dashboard/orders");
}