/* The three physical locations this marketplace tracks inventory against.
   IDs are Admin Addresses (InventoryRecord.AddressID can't reference a Buyer
   Address) — see apps/auto's use-stores.ts / use-fulfilment.tsx for the
   buyer-facing side of the same three locations. */

export interface InventoryLocation {
  id: string
  label: string
}

export const INVENTORY_LOCATIONS: InventoryLocation[] = [
  { id: 'store-sydney', label: 'Sydney' },
  { id: 'store-melbourne', label: 'Melbourne' },
  { id: 'warehouse', label: 'Warehouse (delivery)' },
]
