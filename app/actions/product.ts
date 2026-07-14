"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

async function getVendorForCurrentUser() {
    const { userId } = await auth();
    if (!userId) throw new Error("Not authenticated");

    const vendor = await prisma.vendor.findUnique({ where: { ownerId: userId } });
    if (!vendor) throw new Error("No vendor profile found");

    return vendor;
}

export async function createProduct(formData: FormData) {
    const vendor = await getVendorForCurrentUser();

    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const stock = parseInt((formData.get("stock") as string) || "0", 10);
    const category = (formData.get("category") as string) || null;
    const imageFile = formData.get("image") as File | null;

    if (!name || name.trim().length === 0) throw new Error("Product name is required");
    if (isNaN(price) || price < 0) throw new Error("Price must be a valid positive number");

    let imageUrl: string | null = null;

    if (imageFile && imageFile.size > 0) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${vendor.id}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabaseAdmin.storage
            .from("product-images")
            .upload(fileName, imageFile);

        if (error) throw new Error(`Image upload failed: ${error.message}`);

        const { data: publicUrlData } = supabaseAdmin.storage
            .from("product-images")
            .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
    }

    await prisma.product.create({
        data: {
            vendorId: vendor.id,
            name: name.trim(),
            price,
            stock,
            category,
            image: imageUrl,
        },
    });

    revalidatePath("/dashboard/products");
}

export async function toggleAvailability(productId: string, isAvailable: boolean) {
    const vendor = await getVendorForCurrentUser();

    await prisma.product.updateMany({
        where: { id: productId, vendorId: vendor.id }, // scoped to this vendor, prevents editing others' products
        data: { isAvailable },
    });

    revalidatePath("/dashboard/products");
}

export async function deleteProduct(productId: string) {
    const vendor = await getVendorForCurrentUser();

    await prisma.product.deleteMany({
        where: { id: productId, vendorId: vendor.id },
    });

    revalidatePath("/dashboard/products");
}