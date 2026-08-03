"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { updateOrderStatus } from "@/app/actions/order";

type OrderItem = {
    id: string;
    name: string;
    quantity: number;
    price: string;
};

type Order = {
    id: string;
    status: string;
    total: string;
    createdAt: string;
    items: OrderItem[];
};

const STATUS_FLOW: Record<string, string> = {
    PENDING: "PREPARING",
    PREPARING: "READY",
    READY: "COMPLETED",
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: "New",
    PREPARING: "Preparing",
    READY: "Ready",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-blue-100 text-blue-700",
    PREPARING: "bg-yellow-100 text-yellow-700",
    READY: "bg-green-100 text-green-700",
    COMPLETED: "bg-gray-100 text-gray-500",
    CANCELLED: "bg-red-100 text-red-700",
};

export default function OrdersList({
    initialOrders,
    vendorId,
}: {
    initialOrders: Order[];
    vendorId: string;
}) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);

    useEffect(() => {
        // Ask for browser notification permission once, on mount
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }

        const channel = supabase
            .channel(`orders-${vendorId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: `vendorId=eq.${vendorId}`,
                },
                (payload) => {
                    if (payload.eventType === "UPDATE") {
                        setOrders((prev) =>
                            prev.map((o) =>
                                o.id === payload.new.id ? { ...o, status: payload.new.status } : o
                            )
                        );
                    }
                    if (payload.eventType === "INSERT") {
                        // New order arrived — notify, then refetch to get full item details
                        // (the realtime payload only contains the raw order row, not joined items)
                        if (Notification.permission === "granted") {
                            new Notification("New order received", {
                                body: `Order #${payload.new.id.slice(-6).toUpperCase()}`,
                            });
                        }
                        window.location.reload(); // simplest reliable way to pull in the new order + its items
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [vendorId]);

    async function handleAdvance(orderId: string, currentStatus: string) {
        const nextStatus = STATUS_FLOW[currentStatus];
        if (!nextStatus) return;

        // Optimistic update — reflect the change immediately, before the server confirms
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
        await updateOrderStatus(orderId, nextStatus as any);
    }

    if (orders.length === 0) {
        return <p className="text-gray-500 text-sm">No orders yet.</p>;
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-medium">Order #{order.id.slice(-6).toUpperCase()}</p>
                            <p className="text-xs text-gray-400">
                                {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                        </div>
                        <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status]}`}
                        >
                            {STATUS_LABELS[order.status]}
                        </span>
                    </div>

                    <div className="space-y-1 mb-3">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between gap-3 text-sm text-gray-600">
                                <span className="truncate">
                                    {item.quantity}× {item.name}
                                </span>
                                <span className="flex-shrink-0">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="font-semibold">${order.total}</span>
                        {STATUS_FLOW[order.status] && (
                            <button
                                onClick={() => handleAdvance(order.id, order.status)}
                                className="text-sm rounded-md bg-black text-white px-3 py-1.5 font-medium"
                            >
                                Mark as {STATUS_LABELS[STATUS_FLOW[order.status]]}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}