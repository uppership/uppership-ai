// src/types/order.ts
export type OrderRow = {
    id: string;
    shop_domain: string;
    order_name: string;
    region: string | null;
    created_at: string; // ISO string
    fulfillment_status: string | null;
    easypost_tracker_id: string | null;
    tracking_numbers: string[]; // jsonb[]
    tracking_status: string | null;
    tracking_last_update: string | null;
    tracking_delivered_at: string | null;
    tracking_problem: string | null;
    tracking_flagged: boolean | null;
    tracking_ignore: boolean | null;
    links?: { shopify_search: string };
  };
  
  export type OrderItem = {
    sku: string;
    title: string;
    ordered: number;
    fulfilled: number;
  };
  
  export type OrderDetails = {
    order: OrderRow;
    items: OrderItem[];
  };
  