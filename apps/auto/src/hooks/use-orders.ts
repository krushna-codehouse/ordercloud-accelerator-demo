import { useMemo } from "react";
import { LineItems, Me, type LineItem, type Order } from "ordercloud-javascript-sdk";
import { useAuthQuery } from "@ordercloud/react-sdk";

export interface OrderWithItems extends Order {
  lineItems: LineItem[];
}

/** This shopper's placed (submitted) order history, each with its line items attached (needed for product images/search). */
export function useOrders() {
  const { data, isLoading: ordersLoading } = useAuthQuery({
    queryKey: ["myOrders"],
    queryFn: async () =>
      await Me.ListOrders({
        filters: { IsSubmitted: true },
        sortBy: ["!DateSubmitted"],
        pageSize: 100,
      }),
    retry: false,
    refetchOnMount: false,
  });

  // Belt-and-braces: filter client-side too rather than trust the server-side
  // filter alone (a boolean xp filter silently failed once already in this app).
  const orders = useMemo(() => (data?.Items ?? []).filter((o: Order) => o.IsSubmitted), [data]);
  const orderIDs = useMemo(() => orders.map((o) => o.ID).filter((id): id is string => Boolean(id)), [orders]);

  // A plain object, not a Map — react-query's structural sharing doesn't
  // know how to diff a Map and silently mangles it into something else.
  const { data: itemsByOrderId, isLoading: itemsLoading } = useAuthQuery({
    queryKey: ["myOrdersLineItems", orderIDs.join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        orderIDs.map(async (id) => {
          const page = await LineItems.List("Outgoing", id, { pageSize: 100 });
          return [id, page.Items ?? []] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, LineItem[]>;
    },
    retry: false,
    refetchOnMount: false,
    disabled: orderIDs.length === 0,
  });

  const ordersWithItems: OrderWithItems[] = useMemo(
    () => orders.map((order) => ({ ...order, lineItems: itemsByOrderId?.[order.ID ?? ""] ?? [] })),
    [orders, itemsByOrderId],
  );

  return { orders: ordersWithItems, isLoading: ordersLoading || (orderIDs.length > 0 && itemsLoading) };
}
