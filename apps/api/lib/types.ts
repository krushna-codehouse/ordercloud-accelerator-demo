export interface Address {
  ID?: string
  AddressName?: string
  Street1?: string
  Street2?: string
  City?: string
  State?: string
  Zip?: string
  Country?: string
  CompanyName?: string
}

export interface LineItem {
  ID: string
  Quantity: number
  LineTotal: number
  ShippingAddress?: Address
}

export interface Order {
  ID: string
  Total: number
  Currency: string
  BillingAddress?: Address
  ShippingAddressID?: string
  FromUser: {
    CompanyID: string
    xp?: { PaymentProcessorCustomerID?: string }
  }
  PromotionDiscount: number
  /** Set by the storefront cart when the shopper chooses in-store pickup over delivery. */
  xp?: {
    fulfilmentType?: 'pickup' | 'delivery'
    pickupStoreName?: string
  }
}

export interface OrderWorksheet {
  Order: Order
  LineItems: LineItem[]
}

export interface OrderCheckoutIEPayload {
  OrderWorksheet: OrderWorksheet
}

export interface ShipEstimateItem {
  LineItemID: string
  Quantity: number
}

export interface ShipMethod {
  ID: string
  Name: string
  Cost: number
  EstimatedTransitDays: number
  Carrier?: string
}

export interface ShipEstimate {
  ID: string
  ShipEstimateItems: ShipEstimateItem[]
  ShipMethods?: ShipMethod[]
}

export interface ShipEstimateResponse {
  ShipEstimates: ShipEstimate[]
}

export interface ShippingRate {
  ID: string
  Name: string
  Cost: number
  EstimatedTransitDays: number
  Carrier?: string
}

export interface ShippingPackage {
  Height: number
  Width: number
  Length: number
  Weight: number
  ShipFrom: Address
  ShipTo: Address
  SignatureRequired: boolean
}

export interface OrderSummaryForTax {
  OrderID: string
  LineItems: { LineItemID: string; Quantity: number; LineTotal: number }[]
  PromotionDiscount: number
}

export interface OrderTaxCalculation {
  TotalTax: number
}

export interface OrderCalculateResponse {
  TaxTotal: number
}

export interface SafeCardDetails {
  SavedCardID?: string
  Token?: string
}

export interface Payment {
  ID: string
  Amount: number
  xp?: { SafeCardDetails?: SafeCardDetails }
}

export interface CreateAddressWebhookPayload {
  Route: string
  Verb: string
  Request: {
    Body: Address
  }
  ConfigData: unknown
}

export interface RegisterPayload {
  accountType: 'personal' | 'trade'
  username: string
  password: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  companyName?: string
  abn?: string
  message?: string
}

export interface RegisterResult {
  success: boolean
  error?: string
}
