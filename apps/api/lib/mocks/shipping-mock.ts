import type { ShippingPackage, ShippingRate } from '../types'

export async function calculateShippingRates(_packages: ShippingPackage[]): Promise<ShippingRate[][]> {
  return [
    [
      { ID: 'MOCK_rate_express', Name: 'Express Post', Cost: 14.95, EstimatedTransitDays: 1, Carrier: 'Australia Post' },
      { ID: 'MOCK_rate_standard', Name: 'Standard Post', Cost: 9.95, EstimatedTransitDays: 5, Carrier: 'Australia Post' },
      { ID: 'MOCK_rate_free', Name: 'Free Standard Post', Cost: 0, EstimatedTransitDays: 7, Carrier: 'Australia Post' },
    ],
  ]
}
