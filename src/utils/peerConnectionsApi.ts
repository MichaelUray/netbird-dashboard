import useFetchApi from "@utils/api";
import { useApiCall } from "@utils/api";
import type {
  PeerConnectionMap,
  PeerConnectionRefreshResponse,
} from "@/interfaces/Peer";

/**
 * Hook: fetch the connection map for a peer. The optional `since` parameter
 * maps to ?since=<refresh-nonce> -- it is the nonce returned by
 * usePeerConnectionsRefresh, NOT a sequence number. Server returns only when
 * a fresh map with InResponseToNonce >= since is available (or 5 s timeout).
 */
export function usePeerConnections(peerId: string, since?: number) {
  const url = since
    ? `/peers/${peerId}/connections?since=${since}`
    : `/peers/${peerId}/connections`;
  return useFetchApi<PeerConnectionMap>(url, true, false);
}

/**
 * Hook: returns a callable that POSTs to /peers/{id}/connections/refresh.
 */
export function usePeerConnectionsRefresh(peerId: string) {
  return useApiCall<PeerConnectionRefreshResponse>(
    `/peers/${peerId}/connections/refresh`,
    true,
  );
}
