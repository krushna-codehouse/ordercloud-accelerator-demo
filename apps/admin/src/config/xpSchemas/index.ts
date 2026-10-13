import { OpenAPIV3 } from "openapi-types";
import { usersXp } from "./users";
import { ordersXp } from "./orders";

export const schemaObject: OpenAPIV3.SchemaObject = {
  "title": "XpSchemas",
  "description": "Marketplace-specific schemas for OrderCloud resources.",
  "type": "object",
  "properties": {
    // "Products": productXp,  // import schema here
    "Orders": ordersXp,
    "Users": usersXp,
    // "AdminUsers"
    // "UserGroups"
    // "Suppliers"
    // "Catalogs"
    // "Buyers"
    },
  }