import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getVendorQrCode } from "@/app/actions/qrcode";

export default async function QrCodePage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const vendor = await prisma.vendor.findUnique({ where: { ownerId: userId } });
    if (!vendor) redirect("/onboarding");

    const { qrDataUrl, storefrontUrl } = await getVendorQrCode();
    const downloadFileName = vendor.businessName + "-qrcode.png";

    return (
        <div className="p-8 max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-2">Your QR Code</h1>
            <p className="text-gray-500 text-sm mb-6">
                Print this and display it at your stand.
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Shop QR Code" className="mx-auto rounded-lg border" />

            <p className="text-xs text-gray-400 mt-4 break-all">{storefrontUrl}</p>

            <div className="flex gap-3 justify-center mt-6">
                <a href={qrDataUrl} download={downloadFileName} className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium">
                    Download
                </a>
                <a href={storefrontUrl} target="_blank" className="rounded-md border px-4 py-2 text-sm font-medium">
                    View Menu
                </a>
            </div>
        </div>
    );
}