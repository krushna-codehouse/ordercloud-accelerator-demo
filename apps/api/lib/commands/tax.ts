import { calculateTaxEstimate } from '../mocks/tax-mock'
import type { OrderCalculateResponse, OrderCheckoutIEPayload } from '../types'

export async function calculateOrder(payload: OrderCheckoutIEPayload): Promise<OrderCalculateResponse> {
  const { Order, LineItems } = payload.OrderWorksheet
  const calculation = await calculateTaxEstimate({
    OrderID: Order.ID,
    LineItems: LineItems.map(li => ({ LineItemID: li.ID, Quantity: li.Quantity, LineTotal: li.LineTotal })),
    PromotionDiscount: Order.PromotionDiscount,
  })
  return { TaxTotal: calculation.TotalTax }
}
