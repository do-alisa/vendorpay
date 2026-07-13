"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import crypto from "crypto";

export async function createVendor(formData: FormData) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Not authenticated");
    }

    const businessName = formData.get("businessName") as string;
    const address = formData.get("address") as string;

    if (!businessName || businessName.trim().length === 0) {
        throw new Error("Business name is required");
    }

    // Ensure the User row exists, regardless of whether the webhook has fired yet
    const user = await currentUser();
    if (!user) {
        throw new Error("Could not load user details");
    }

    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            email: user.emailAddresses[0]?.emailAddress ?? "",
            name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed",
        },
    });

    const baseSlug = businessName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const uniqueSuffix = crypto.randomBytes(3).toString("hex");
    const qrCode = `${baseSlug}-${uniqueSuffix}`;

    await prisma.vendor.create({
        data: {
            ownerId: userId,
            businessName: businessName.trim(),
            address: address?.trim() || null,
            qrCode,
        },
    });

    redirect("/dashboard");
}