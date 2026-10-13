import { OpenAPIV3 } from "openapi-types";

/* xp shape written by apps/auto's self-service signup (apps/api/lib/commands/register.ts).
   Property names are camelCase to match what that endpoint actually writes. */

export const usersXp: OpenAPIV3.SchemaObject = {
  "type": "object",
  "properties": {
    "accountType": {
      "type": "string",
      "enum": ["personal", "trade"]
    },
    "approvalStatus": {
      "type": "string",
      "enum": ["pending", "approved", "rejected"]
    },
    "companyName": {
      "type": "string"
    },
    "abn": {
      "type": "string"
    },
    "message": {
      "type": "string",
      "maxLength": 1000
    }
  }
}
