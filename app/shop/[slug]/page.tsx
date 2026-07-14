import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function StorefrontPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const vendor = await prisma.vendor.findUnique({
        where: { qrCode: slug },
        include: {
            products: {
                where: { isAvailable: true },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!vendor) {
        notFound();
    }

    // Group products by category, with uncategorized items under "Menu"
    const grouped = vendor.products.reduce<Record<string, typeof vendor.products>>(
        (acc, product) => {
            const key = product.category?.trim() || "Menu";
            if (!acc[key]) acc[key] = [];
            acc[key].push(product);
            return acc;
        },
        {}
    );

    return (
        <div className="min-h-screen max-w-md mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{vendor.businessName}</h1>
                {vendor.address && <p className="text-gray-500 text-sm mt-1">{vendor.address}</p>}
            </div>

            {vendor.products.length === 0 && (
                <p className="text-gray-500">This shop hasn't added any products yet.</p>
            )}

            {Object.entries(grouped).map(([category, products]) => (
                <div key={category} className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">{category}</h2>
                    <div className="space-y-3">
                        {products.map((product) => (
                            <div className="flex items-center justify-between border rounded-lg p-3 gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {product.image && (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-14 h-14 object-cover rounded-md flex-shrink-0"
                                        />
                                    )}
                                    <p className="font-medium truncate">{product.name}</p>
                                </div>
                                <p className="font-semibold flex-shrink-0">${product.price.toString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}