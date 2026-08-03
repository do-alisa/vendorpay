import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import StorefrontCart from "@/components/storefront-cart";

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

    const products = vendor.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price.toString(),
        image: p.image,
        category: p.category,
    }));

    return (
        <div className="min-h-screen max-w-md mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{vendor.businessName}</h1>
                {vendor.address && <p className="text-gray-500 text-sm mt-1">{vendor.address}</p>}
            </div>

            {products.length === 0 ? (
                <p className="text-gray-500">This shop hasn't added any products yet.</p>
            ) : (
                <StorefrontCart products={products} vendorId={vendor.id} />
            )}
        </div>
    );
}