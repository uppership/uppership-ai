export interface Package {
    id: string;
    order_name: string;
    customer_name: string;
    dest_city: string | null;
    dest_state: string | null;
    carrier: string | null;
    tracking_number: string | null;
    status: string;
    eta?: string | null;
    flags?: string[] | null;
    updated_at: string;
    created_at?: string | null; 
    tracking_ignore?: boolean | null;
  }
  