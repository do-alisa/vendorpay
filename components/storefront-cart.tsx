"use client";

import { useState, useMemo } from "react";
import { createCheckoutSession } from "@/app/actions/checkout";

type Product = {
    id: string;
    name: string;
    price: string; // Decimal comes through as string from the server component
    image: string | null;
    category: string | null;
};

type CartItem = {
    product: Product;
    quantity: number;
};

export default function StorefrontCart({
    products,
    vendorId,
}: {
    products: Product[];
    vendorId: string;
}) {
    const [cart, setCart] = useState<Record<string, number>>({});
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const grouped = useMemo(() => {
        return products.reduce<Record<string, Product[]>>((acc, product) => {
            const key = product.category?.trim() || "Menu";
            if (!acc[key]) acc[key] = [];
            acc[key].push(product);
            return acc;
        }, {});
    }, [products]);

    const cartItems: CartItem[] = useMemo(() => {
        return Object.entries(cart)
            .filter(([, qty]) => qty > 0)
            .map(([productId, quantity]) => ({
                product: products.find((p) => p.id === productId)!,
                quantity,
            }));
    }, [cart, products]);

    const subtotal = useMemo(() => {
        return cartItems.reduce(
            (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
            0
        );
    }, [cartItems]);

    function addToCart(productId: string) {
        setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
    }

    function decrementItem(productId: string) {
        setCart((prev) => {
            const current = prev[productId] || 0;
            if (current <= 1) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: current - 1 };
        });
    }

    async function handleCheckout() {
        setIsCheckingOut(true);
        try {
            const items = cartItems.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
            }));
            const { url } = await createCheckoutSession(vendorId, items);
            if (url) {
                window.location.href = url;
            }
        } catch (err) {
            alert("Something went wrong starting checkout. Please try again.");
            console.error(err);
        } finally {
            setIsCheckingOut(false);
        }
    }

    return (
        <div className="pb-32">
            {Object.entries(grouped).map(([category, categoryProducts]) => (
                <div key={category} className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">{category}</h2>
                    <div className="space-y-3">
                        {categoryProducts.map((product) => {
                            const qtyInCart = cart[product.id] || 0;
                            return (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between border rounded-lg p-3 gap-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {product.image && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-14 h-14 object-cover rounded-md flex-shrink-0"
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{product.name}</p>
                                            <p className="text-sm text-gray-500">
                                                ${parseFloat(product.price).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {qtyInCart === 0 ? (
                                        <button
                                            onClick={() => addToCart(product.id)}
                                            className="flex-shrink-0 rounded-md bg-black text-white px-3 py-1.5 text-sm font-medium"
                                        >
                                            Add
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => decrementItem(product.id)}
                                                className="w-7 h-7 rounded-full border flex items-center justify-center"
                                            >
                                                −
                                            </button>
                                            <span className="w-5 text-center text-sm">{qtyInCart}</span>
                                            <button
                                                onClick={() => addToCart(product.id)}
                                                className="w-7 h-7 rounded-full border flex items-center justify-center"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {cartItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                    <div className="max-w-md mx-auto">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-500">
                                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item
                                {cartItems.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? "s" : ""}
                            </span>
                            <span className="font-semibold">${subtotal.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={isCheckingOut}
                            className="w-full rounded-md bg-black text-white py-3 font-medium disabled:opacity-50"
                        >
                            {isCheckingOut ? "Redirecting..." : "Checkout"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}