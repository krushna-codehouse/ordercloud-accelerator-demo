import { Me } from "ordercloud-javascript-sdk";
import { useAuthQuery } from "@ordercloud/react-sdk";

/** The signed-in buyer (null/idle when anonymous). */
export function useCurrentUser() {
  return useAuthQuery({
    queryKey: ["currentUser"],
    queryFn: async () => await Me.Get(),
    retry: false,
    refetchOnMount: false,
  });
}
