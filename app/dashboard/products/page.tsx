import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createProduct, toggleAvailability, deleteProduct } from "@/app/actions/product";

export default async function ProductsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const vendor = await prisma.vendor.findUnique({ where: { ownerId: userId } });
    if (!vendor) redirect("/onboarding");

    const products = await prisma.product.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Products</h1>

            <form action={createProduct} className="space-y-4 border rounded-lg p-6 mb-8">
                <h2 className="font-semibold">Add a product</h2>

                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                        name="name"
                        type="text"
                        required
                        placeholder="Iced Coffee"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                        <input
                            name="price"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="4.50"
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Stock</label>
                        <input
                            name="stock"
                            type="number"
                            min="0"
                            placeholder="20"
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Category (optional)</label>
                    <input
                        name="category"
                        type="text"
                        placeholder="Beverages"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Image (optional)</label>
                    <input
                        name="image"
                        type="file"
                        accept="image/*"
                        className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
                    />
                </div>

                <button type="submit" className="w-full rounded-md bg-black text-white py-2 font-medium">
                    Add product
                </button>
            </form>

            <div className="space-y-3">
                {products.length === 0 && (
                    <p className="text-gray-500 text-sm">No products yet. Add your first one above.</p>
                )}

                {products.map((product) => (
                    <div
                        key={product.id}
                        className="flex items-center justify-between border rounded-lg p-4"
                    >
                        <div className="flex items-center gap-3">
                            {product.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded-md"
                                />
                            )}
                            <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-500">
                                    ${product.price.toString()} · Stock: {product.stock}
                                    {product.category && ` · ${product.category}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <form
                                action={async () => {
                                    "use server";
                                    await toggleAvailability(product.id, !product.isAvailable);
                                }}
                            >
                                <button
                                    type="submit"
                                    className={`text-xs px-2 py-1 rounded-full ${product.isAvailable
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-500"
                                        }`}
                                >
                                    {product.isAvailable ? "Available" : "Unavailable"}
                                </button>
                            </form>

                            <form
                                action={async () => {
                                    "use server";
                                    await deleteProduct(product.id);
                                }}
                            >
                                <button type="submit" className="text-xs text-red-500 hover:underline">
                                    Delete
                                </button>
                            </form>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}