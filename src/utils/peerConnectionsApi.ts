import useFetchApi from "@utils/api";
import { useApiCall } from "@utils/api";
import type {
  PeerConnectionMap,
  PeerConnectionRefreshResponse,
} from "@/interfaces/Peer";

/**
 * Hook: fetch the connection map for a peer, optionally filtering by sequence
 * number (since parameter maps to ?since=<seq>).
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
