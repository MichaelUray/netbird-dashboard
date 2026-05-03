"use client";

import { cn } from "@utils/helpers";
import type { PeerConnectionEntry } from "@/interfaces/Peer";
import React, { useState } from "react";

const CONN_COLOR: Record<string, string> = {
  p2p: "bg-green-500",
  relayed: "bg-yellow-500",
  idle: "bg-nb-gray-400",
  connecting: "bg-nb-gray-400",
  unspecified: "bg-red-500",
};

const CONN_LABEL: Record<string, string> = {
  p2p: "P2P",
  relayed: "Relayed",
  idle: "Idle",
  connecting: "Connecting",
  unspecified: "Offline",
};

export default function PeerConnectionRow({
  entry,
  showFull,
}: {
  entry: PeerConnectionEntry;
  showFull: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const color = CONN_COLOR[entry.conn_type] ?? "bg-red-500";
  const label = CONN_LABEL[entry.conn_type] ?? entry.conn_type;
  const displayName = entry.remote_fqdn
    ? entry.remote_fqdn.split(".")[0]
    : entry.remote_pubkey.slice(0, 16) + "...";

  const details = [
    ["IP / FQDN", entry.remote_fqdn ?? entry.remote_pubkey],
    ["Connection type", label],
    ["Last handshake", entry.last_handshake ?? "—"],
    [
      "Latency",
      entry.latency_ms !== undefined ? entry.latency_ms + " ms" : "—",
    ],
    entry.endpoint ? ["Endpoint", entry.endpoint] : null,
    entry.relay_server ? ["Relay server", entry.relay_server] : null,
    entry.rx_bytes !== undefined
      ? ["RX", formatBytes(entry.rx_bytes)]
      : null,
    entry.tx_bytes !== undefined
      ? ["TX", formatBytes(entry.tx_bytes)]
      : null,
  ].filter(Boolean) as [string, string][];

  return (
    <div className={"border-b border-nb-gray-800 last:border-b-0"}>
      <button
        className={cn(
          "w-full flex items-center px-4 py-3 text-left",
          "hover:bg-nb-gray-800/40 transition-colors",
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className={cn("w-3 h-3 rounded-full mr-3 shrink-0", color)}
        />
        <span className={"flex-1 font-medium text-sm"}>{displayName}</span>
        {showFull && (
          <span className={"text-xs text-nb-gray-400 mr-4"}>{label}</span>
        )}
        <span className={"text-nb-gray-500 text-xs"}>
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div
          className={
            "px-4 py-3 bg-nb-gray-930 border-t border-nb-gray-800 text-xs"
          }
        >
          <dl className={"grid grid-cols-[auto_1fr] gap-x-6 gap-y-1"}>
            {details.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className={"text-nb-gray-400 whitespace-nowrap"}>{k}</dt>
                <dd className={"text-nb-gray-200 break-all"}>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}
