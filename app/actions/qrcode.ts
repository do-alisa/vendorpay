"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function getVendorQrCode() {
    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");

    const vendor = await prisma.vendor.findUnique({ where: { ownerId: userId } });
    if (!vendor) throw new Error("No vendor profile found");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const storefrontUrl = `${baseUrl}/shop/${vendor.qrCode}`;

    const qrDataUrl = await QRCode.toDataURL(storefrontUrl, {
        width: 400,
        margin: 2,
    });

    return { qrDataUrl, storefrontUrl };
}