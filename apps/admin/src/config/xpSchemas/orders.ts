import { OpenAPIV3 } from "openapi-types";

/* xp shape written by apps/auto's checkout fulfilment choice (apps/auto/src/hooks/use-fulfilment.tsx).
   Property names are camelCase to match what that hook actually writes. */

export const ordersXp: OpenAPIV3.SchemaObject = {
  "type": "object",
  "properties": {
    "fulfilmentType": {
      "type": "string",
      "enum": ["delivery", "pickup"]
    },
    "pickupStoreName": {
      "type": "string"
    }
  }
}
