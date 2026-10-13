import { ocClient } from '../oc-client'
import type { RegisterPayload, RegisterResult } from '../types'

const BUYER_ID = process.env.OC_BUYER_ID ?? 'auto-buyer'

export async function registerUser(payload: RegisterPayload): Promise<RegisterResult> {
  const { accountType, username, password, email, firstName, lastName, phone, companyName, abn, message } = payload

  if (!username || !password || !email || !firstName || !lastName) {
    return { success: false, error: 'Please fill in all required fields.' }
  }
  if (accountType === 'trade' && !companyName) {
    return { success: false, error: 'Company name is required for a trade account.' }
  }

  const xp =
    accountType === 'trade'
      ? { accountType, approvalStatus: 'pending', companyName, abn: abn || null, message: message || null }
      : { accountType }

  try {
    await ocClient.post(`/buyers/${BUYER_ID}/users`, {
      Username: username,
      Password: password,
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      Phone: phone || null,
      Active: true,
      xp,
    })
    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : ''
    if (/OC API error 409/.test(errorMessage)) {
      return { success: false, error: 'That username is already taken. Please choose another.' }
    }
    return { success: false, error: 'Something went wrong creating your account. Please try again.' }
  }
}
