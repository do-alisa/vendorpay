import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect("/sign-in");
    }

    const vendor = await prisma.vendor.findUnique({
        where: { ownerId: userId },
    });

    if (!vendor) {
        redirect("/onboarding");
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{vendor.businessName}</h1>
                <div className="flex items-center gap-4">
                    <a href="/dashboard/products" className="text-sm underline">
                        Manage Products
                    </a>
                    <a href="/dashboard/qrcode" className="text-sm underline">
                        QR Code
                    </a>
                    <UserButton />
                </div>
            </div>
            <p>You're signed in and your shop is set up.</p>
        </div>
    );
}