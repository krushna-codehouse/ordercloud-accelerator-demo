import { calculateShippingRates } from '../mocks/shipping-mock'
import { mapToPackages } from '../mappers/shipping-mapper'
import type { OrderCheckoutIEPayload, ShipEstimateResponse } from '../types'

export async function estimateShippingRates(payload: OrderCheckoutIEPayload): Promise<ShipEstimateResponse> {
  const { Order, LineItems } = payload.OrderWorksheet
  const response: ShipEstimateResponse = {
    ShipEstimates: [
      {
        ID: Order.ID,
        ShipEstimateItems: LineItems.map(li => ({ LineItemID: li.ID, Quantity: li.Quantity })),
      },
    ],
  }

  // Whole-order pickup: skip carrier rates entirely, offer the one free option.
  if (Order.xp?.fulfilmentType === 'pickup') {
    response.ShipEstimates[0].ShipMethods = [
      {
        ID: 'PICKUP_INSTORE',
        Name: Order.xp.pickupStoreName ? `Pickup at ${Order.xp.pickupStoreName}` : 'Pickup in store',
        Cost: 0,
        EstimatedTransitDays: 0,
      },
    ]
    return response
  }

  const packages = await mapToPackages(payload, response.ShipEstimates)
  const rates = await calculateShippingRates(packages)

  response.ShipEstimates[0].ShipMethods = rates[0].map(rate => ({
    ID: rate.ID,
    Name: rate.Name,
    Cost: rate.Cost,
    EstimatedTransitDays: rate.EstimatedTransitDays,
  }))

  return response
}
