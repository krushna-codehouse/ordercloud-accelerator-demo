import { ocClient } from '../oc-client'
import { authorizeCC, getIFrameCredential } from '../mocks/payment-mock'
import type { Payment } from '../types'

interface OCOrderWorksheet {
  Order: { ID: string; Total: number; Currency: string; BillingAddress?: unknown }
}

export async function authorizeCardPayment(orderID: string, paymentID: string): Promise<Payment> {
  const worksheet = await ocClient.get<OCOrderWorksheet>(`/orders/All/${orderID}/worksheet`)
  const payment = await ocClient.get<Payment>(`/orders/All/${orderID}/payments/${paymentID}`)

  // Throws in mock — replace authorizeCC() with a real processor integration for production
  const authorizationResult = await authorizeCC()

  await ocClient.patch<Payment>(`/orders/All/${worksheet.Order.ID}/payments/${payment.ID}`, {
    Accepted: true,
    Amount: worksheet.Order.Total,
  })

  const updatedPayment = await ocClient.post<Payment>(
    `/orders/All/${worksheet.Order.ID}/payments/${payment.ID}/transactions`,
    {
      ID: authorizationResult,
      Amount: payment.Amount,
      DateExecuted: new Date().toISOString(),
      ResultCode: 'MOCK_AUTH',
      ResultMessage: 'Mock authorization succeeded',
      Succeeded: true,
      Type: 'Authorization',
    }
  )

  return updatedPayment
}

export async function getIFrameCredentials(): Promise<string> {
  const credential = await getIFrameCredential()
  return credential ?? process.env.PAYMENT_IFRAME_PUBLIC_KEY ?? ''
}
