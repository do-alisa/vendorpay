import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createVendor } from "@/app/actions/vendor";

export default async function OnboardingPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect("/sign-in");
    }

    // If they already have a vendor profile, skip onboarding
    const existingVendor = await prisma.vendor.findUnique({
        where: { ownerId: userId },
    });
    if (existingVendor) {
        redirect("/dashboard");
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-8">
            <div className="w-full max-w-md">
                <h1 className="text-2xl font-bold mb-2">Set up your shop</h1>
                <p className="text-gray-500 mb-6">
                    Tell us a bit about your business to get started.
                </p>

                <form action={createVendor} className="space-y-4">
                    <div>
                        <label htmlFor="businessName" className="block text-sm font-medium mb-1">
                            Business name
                        </label>
                        <input
                            id="businessName"
                            name="businessName"
                            type="text"
                            required
                            placeholder="Sunny Day Cafe"
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label htmlFor="address" className="block text-sm font-medium mb-1">
                            Address <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            id="address"
                            name="address"
                            type="text"
                            placeholder="123 Main St, City, State"
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-md bg-black text-white py-2 font-medium"
                    >
                        Create shop
                    </button>
                </form>
            </div>
        </div>
    );
}