"use client";

import { Button, Flex } from "@chakra-ui/react";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { CollectOrdersModal } from "./CollectOrdersModal";
import { SyncOrdersModal } from "./SyncOrdersModal";

interface Props {
  /** 결제완료 페이지에서만 수집 버튼을 노출. 그 외(신규/출고/배송/전체/클레임)는 동기화만 */
  showCollect?: boolean;
  size?: "xs" | "sm" | "md";
}

export function OrderSyncButtons({
  showCollect = false,
  size = "sm",
}: Props): React.JSX.Element {
  const [collectOpen, setCollectOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  return (
    <>
      <Flex gap={2}>
        {showCollect && (
          <Button
            size={size}
            variant="outline"
            borderColor="gray.300"
            onClick={() => setCollectOpen(true)}
          >
            <Download size={14} />
            수집
          </Button>
        )}
        <Button
          size={size}
          variant="outline"
          borderColor="gray.300"
          onClick={() => setSyncOpen(true)}
        >
          <RefreshCw size={14} />
          동기화
        </Button>
      </Flex>
      <CollectOrdersModal open={collectOpen} onClose={() => setCollectOpen(false)} />
      <SyncOrdersModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </>
  );
}
