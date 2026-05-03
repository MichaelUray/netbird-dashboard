"use client";

import Button from "@components/Button";
import Breadcrumbs from "@components/Breadcrumbs";
import { Checkbox } from "@components/Checkbox";
import PageContainer from "@/layouts/PageContainer";
import PeerIcon from "@/assets/icons/PeerIcon";
import {
  usePeerConnections,
  usePeerConnectionsRefresh,
} from "@utils/peerConnectionsApi";
import type { PeerConnectionEntry } from "@/interfaces/Peer";
import PeerConnectionRow from "./PeerConnectionRow";
import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "peerDetailLevel";

export default function PeerConnectionsView({ peerId }: { peerId: string }) {
  const [since, setSince] = useState<number | undefined>(undefined);
  const [showFull, setShowFull] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [busy, setBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const { data, error, mutate } = usePeerConnections(peerId, since);
  const refreshApi = usePeerConnectionsRefresh(peerId);

  // Auto-poll every 30s
  useEffect(() => {
    const t = setInterval(() => mutate(), 30_000);
    return () => clearInterval(t);
  }, [mutate]);

  async function onRefresh() {
    setBusy(true);
    setRefreshError(null);
    setRefreshNotice(null);
    try {
      const res = await refreshApi.post(undefined);
      if (res?.dispatched === false) {
        // Codex review: server tells us no live Sync stream exists for
        // this peer right now (offline / between connections / older
        // daemon without snapshot-request support). Surface the cached
        // map directly (if any) and skip the long-poll wait.
        // setSince(undefined) drops any stale ?since= filter from a
        // previous successful refresh -- otherwise SWR would block on
        // the long-poll endpoint waiting for a nonce that will never
        // arrive (until either a fresh refresh fires or the server
        // 5 s timeout elapses).
        setSince(undefined);
        setRefreshNotice(
          "No live connection to this peer right now — showing the last cached map.",
        );
        // mutate the SWR cache directly with the cached_map the server
        // already handed us. SWR de-duplicates on the URL, so populating
        // the unfiltered (no-since) URL surfaces the data immediately
        // even before mutate() returns.
        if (res.cached_map) {
          await mutate(res.cached_map, { revalidate: false });
        } else {
          await mutate();
        }
        return;
      }
      if (res?.refresh_token !== undefined) {
        setSince(res.refresh_token);
      }
      await mutate();
    } catch (e: any) {
      setRefreshError(e?.message ?? "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  function onToggleFull(checked: boolean | "indeterminate") {
    const v = checked === true;
    setShowFull(v);
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  }

  const entries: PeerConnectionEntry[] = data?.entries ?? [];
  const counts = useMemo(() => computeCounts(entries), [entries]);
  const sorted = useMemo(() => sortEntries(entries), [entries]);

  return (
    <PageContainer>
      <div className={"p-default py-6 pb-0"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/peers"}
            label={"Peers"}
            icon={<PeerIcon size={13} />}
          />
          <Breadcrumbs.Item label={peerId} href={`/peer?id=${peerId}`} />
          <Breadcrumbs.Item label={"Connections"} active />
        </Breadcrumbs>
      </div>

      <div className={"p-default py-6 max-w-5xl"}>
        <div className={"flex items-center justify-between mb-6"}>
          <h1 className={"text-2xl font-bold"}>Peer Connections</h1>
          <div className={"flex items-center gap-4"}>
            <label className={"flex items-center gap-2 text-sm cursor-pointer"}>
              <Checkbox checked={showFull} onCheckedChange={onToggleFull} />
              Show full peer details
            </label>
            <Button variant={"secondary"} onClick={onRefresh} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {(error || refreshError) && (
          <div className={"mb-4 text-red-500 text-sm"}>
            {error?.message ?? refreshError}
          </div>
        )}

        {refreshNotice && (
          <div className={"mb-4 text-amber-500 text-sm"}>
            {refreshNotice}
          </div>
        )}

        <div className={"mb-6"}>
          <div className={"text-lg"}>
            <strong>{counts.online}</strong> of{" "}
            <strong>{counts.total}</strong> peers online
          </div>
          <div className={"text-sm text-nb-gray-400 mt-1"}>
            P2P: {counts.p2p} &nbsp; Relayed: {counts.relayed} &nbsp; Idle:{" "}
            {counts.idle} &nbsp; Offline: {counts.offline}
          </div>
        </div>

        <div
          className={
            "border border-nb-gray-800 rounded-lg overflow-hidden"
          }
        >
          {sorted.length === 0 ? (
            <div className={"p-6 text-center text-nb-gray-400 text-sm"}>
              No data yet — peer may be offline or pre-Phase-3.7i.
            </div>
          ) : (
            sorted.map((e) => (
              <PeerConnectionRow
                key={e.remote_pubkey}
                entry={e}
                showFull={showFull}
              />
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function computeCounts(entries: PeerConnectionEntry[]) {
  let p2p = 0,
    relayed = 0,
    idle = 0,
    offline = 0;
  for (const e of entries) {
    switch (e.conn_type) {
      case "p2p":
        p2p++;
        break;
      case "relayed":
        relayed++;
        break;
      case "idle":
      case "connecting":
        idle++;
        break;
      default:
        offline++;
        break;
    }
  }
  return {
    p2p,
    relayed,
    idle,
    offline,
    online: p2p + relayed + idle,
    total: p2p + relayed + idle + offline,
  };
}

function sortEntries(
  entries: PeerConnectionEntry[],
): PeerConnectionEntry[] {
  const order: Record<string, number> = {
    p2p: 0,
    relayed: 1,
    idle: 2,
    connecting: 2,
  };
  return [...entries].sort((a, b) => {
    const oa = order[a.conn_type] ?? 3;
    const ob = order[b.conn_type] ?? 3;
    if (oa !== ob) return oa - ob;
    return (a.remote_fqdn ?? a.remote_pubkey).localeCompare(
      b.remote_fqdn ?? b.remote_pubkey,
    );
  });
}
