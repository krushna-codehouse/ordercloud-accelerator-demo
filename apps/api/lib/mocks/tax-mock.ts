import type { OrderSummaryForTax, OrderTaxCalculation } from '../types'

const GST_RATE = 0.1

export async function calculateTaxEstimate(summary: OrderSummaryForTax): Promise<OrderTaxCalculation> {
  const subtotal = summary.LineItems.reduce((sum, li) => sum + li.LineTotal, 0)
  const taxable = Math.max(0, subtotal - (summary.PromotionDiscount ?? 0))
  const TotalTax = Math.round(taxable * GST_RATE * 100) / 100
  console.log(`subtotal: ${subtotal}, discount: ${summary.PromotionDiscount}, taxable: ${taxable}, tax: ${TotalTax}`);
  return { TotalTax }
}
