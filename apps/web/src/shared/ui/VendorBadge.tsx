"use client";

import { Badge } from "@chakra-ui/react";
import type { ChannelVendor, WMSVendor } from "@oms/types";

type Vendor = ChannelVendor | WMSVendor;

const VENDOR_STYLES: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  QOO10_JP: { label: "Qoo10", bg: "orange.50", color: "orange.700" },
  SHOPIFY: { label: "Shopify", bg: "green.50", color: "green.700" },
  SHOPEE: { label: "Shopee", bg: "red.50", color: "red.700" },
  RAKUTEN: { label: "Rakuten", bg: "red.50", color: "red.800" },
  self: { label: "자체", bg: "gray.100", color: "gray.700" },
  cj_logistics: { label: "CJ", bg: "purple.50", color: "purple.700" },
  hanjin: { label: "한진", bg: "teal.50", color: "teal.700" },
  sftp_batch: { label: "SFTP", bg: "blue.50", color: "blue.700" },
  custom: { label: "Custom", bg: "gray.100", color: "gray.600" },
};

interface Props {
  vendor: Vendor;
  size?: "xs" | "sm";
}

export function VendorBadge({ vendor, size = "xs" }: Props): React.JSX.Element {
  const style = VENDOR_STYLES[vendor] ?? {
    label: vendor,
    bg: "gray.100",
    color: "gray.600",
  };
  return (
    <Badge
      px={size === "xs" ? 1.5 : 2}
      py={0.5}
      borderRadius="md"
      fontSize={size === "xs" ? "10px" : "xs"}
      fontWeight="medium"
      bg={style.bg}
      color={style.color}
      textTransform="none"
    >
      {style.label}
    </Badge>
  );
}
