export interface CatalogItem {
  id: string; tenant_id: string; sku_id: string | null; service_id: string | null;
  item_type: string; sku: string; name: string; description: string | null;
  short_description: string | null; brand: string | null; unit_of_measure: string;
  taxable: boolean; active: boolean; pos_enabled: boolean; ecommerce_enabled: boolean;
  purchasable: boolean; sellable: boolean; created_at: string; updated_at: string;
  // Joined
  stock_on_hand?: number | null;
  unit_cost?: number | null;
  retail_price?: number | null;
}

export interface InventoryMovement {
  id: string; tenant_id: string; movement_type: string; sku_id: string;
  warehouse_id: string | null; from_location_id: string | null; to_location_id: string | null;
  quantity: number; unit_cost: number; total_cost: number | null;
  source_type: string | null; source_id: string | null; reference: string | null;
  reason: string | null; performed_by: string | null; occurred_at: string; created_at: string;
  // Joined
  item_name?: string | null; item_sku?: string | null;
}

export interface ErpVendor {
  id: string; tenant_id: string; vendor_number: string; name: string;
  email: string | null; phone: string | null; tax_identifier: string | null;
  payment_terms: string | null; currency: string | null; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface ErpPurchaseOrder {
  id: string; tenant_id: string; po_number: string; vendor_id: string;
  warehouse_id: string | null; status: string; order_date: string;
  expected_date: string | null; currency: string; subtotal: number;
  tax_total: number; shipping_total: number; total: number; notes: string | null;
  created_by: string | null; created_at: string; updated_at: string;
  // Joined
  vendor_name?: string | null;
}
