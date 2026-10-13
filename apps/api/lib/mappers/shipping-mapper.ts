import { ocClient } from '../oc-client'
import type { Address, OrderCheckoutIEPayload, ShipEstimate, ShippingPackage } from '../types'

const SHIP_FROM_ADDRESS: Address = {
  ID: 'sitecore-hq',
  AddressName: 'US headquarters',
  Street1: '44 Montgomery Street',
  Street2: 'Suite 3340',
  City: 'San Francisco',
  State: 'CA',
  Zip: '94104',
  Country: 'US',
  CompanyName: 'Sitecore',
}

export async function mapToPackages(
  payload: OrderCheckoutIEPayload,
  estimates: ShipEstimate[]
): Promise<ShippingPackage[]> {
  const { Order, LineItems } = payload.OrderWorksheet

  let shippingAddress: Address
  if (Order.ShippingAddressID) {
    shippingAddress = await ocClient.get<Address>(
      `/buyers/${Order.FromUser.CompanyID}/addresses/${Order.ShippingAddressID}`
    )
  } else {
    shippingAddress = LineItems[0]?.ShippingAddress ?? {}
  }

  return estimates.map(() => ({
    Height: 1,
    Width: 1,
    Length: 1,
    Weight: 10,
    ShipFrom: SHIP_FROM_ADDRESS,
    ShipTo: shippingAddress,
    SignatureRequired: false,
  }))
}
