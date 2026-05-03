"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { PageNotFound } from "@components/ui/PageNotFound";
import PeerConnectionsView from "@/modules/peer/PeerConnectionsView";

function PeerConnectionsPageInner() {
  const params = useSearchParams();
  const peerId = params.get("id");

  if (!peerId) {
    return (
      <PageNotFound
        title={"Peer not found"}
        description={"No peer ID was provided. Please return to the peers list."}
      />
    );
  }

  return <PeerConnectionsView peerId={peerId} />;
}

export default function PeerConnectionsPage() {
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <PeerConnectionsPageInner />
    </Suspense>
  );
}
