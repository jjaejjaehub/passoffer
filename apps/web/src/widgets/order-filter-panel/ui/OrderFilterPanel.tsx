"use client";

import { useEffect, useState } from "react";
import { Box, Button, Flex, HStack, Icon, Input, Text } from "@chakra-ui/react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DATE_FIELD_OPTIONS,
  LIVE_CHANNELS,
  type DateField,
} from "@/shared/config";
import { useDebouncedValue } from "@/shared/lib";
import type { OrderListParams } from "@/entities/order";

interface OrderFilterPanelProps {
  value: OrderListParams;
  search: string;
  onChange: (next: OrderListParams) => void;
  onSearchChange: (next: string) => void;
}

// yyyy-mm-dd → ISO (UTC 00:00). 빈 문자열은 undefined.
function toIsoStart(local: string): string | undefined {
  if (!local) return undefined;
  return `${local}T00:00:00.000Z`;
}
function toIsoEnd(local: string): string | undefined {
  if (!local) return undefined;
  return `${local}T23:59:59.999Z`;
}
// ISO → yyyy-mm-dd (input value).
function fromIso(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function OrderFilterPanel({
  value,
  search,
  onChange,
  onSearchChange,
}: OrderFilterPanelProps): React.JSX.Element {
  const t = useTranslations("widgets.orderFilterPanel");
  const tSortFields = useTranslations("config.sortFields");
  const tChannels = useTranslations("config.channels");
  const [localSearch, setLocalSearch] = useState<string>(search);
  const debounced = useDebouncedValue(localSearch, 300);

  useEffect(() => {
    if (debounced !== search) onSearchChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const dateField: DateField = value.dateField ?? "orderedAt";
  const dateFrom = fromIso(value.dateFrom);
  const dateTo = fromIso(value.dateTo);
  const channelId = value.channelId ?? "";

  function patch(next: Partial<OrderListParams>): void {
    onChange({ ...value, ...next, page: 1 });
  }

  function handleReset(): void {
    onChange({
      page: 1,
      pageSize: value.pageSize,
      sortBy: value.sortBy,
      sortDir: value.sortDir,
    });
    setLocalSearch("");
    onSearchChange("");
  }

  return (
    <Box bg="white" borderWidth="1px" borderRadius="md" p={3}>
      <Flex align="center" gap={3} wrap="wrap">
        {/* 날짜 기준 select */}
        <Flex align="center" gap={1.5}>
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            {t("dateFieldLabel")}
          </Text>
          <select
            value={dateField}
            onChange={(e) => patch({ dateField: e.target.value as DateField })}
            style={{
              height: 32,
              padding: "0 8px",
              borderRadius: 6,
              border: "1px solid var(--chakra-colors-gray-200)",
              fontSize: 13,
              background: "white",
            }}
          >
            {DATE_FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {tSortFields(opt.value)}
              </option>
            ))}
          </select>
        </Flex>

        {/* 날짜 from~to */}
        <HStack gap={1.5}>
          <Input
            type="date"
            size="sm"
            value={dateFrom}
            onChange={(e) => patch({ dateFrom: toIsoStart(e.target.value) })}
            w="150px"
          />
          <Text fontSize="xs" color="gray.400">
            ~
          </Text>
          <Input
            type="date"
            size="sm"
            value={dateTo}
            onChange={(e) => patch({ dateTo: toIsoEnd(e.target.value) })}
            w="150px"
          />
        </HStack>

        {/* 채널 select */}
        <Flex align="center" gap={1.5}>
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            {t("channelLabel")}
          </Text>
          <select
            value={channelId}
            onChange={(e) => patch({ channelId: e.target.value || undefined })}
            style={{
              height: 32,
              padding: "0 8px",
              borderRadius: 6,
              border: "1px solid var(--chakra-colors-gray-200)",
              fontSize: 13,
              background: "white",
              minWidth: 120,
            }}
          >
            <option value="">{t("allChannels")}</option>
            {LIVE_CHANNELS.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {tChannels(`${channel.id}.name`)}
              </option>
            ))}
          </select>
        </Flex>

        {/* 검색 */}
        <Box position="relative" flex="1" minW="220px" maxW="360px">
          <Input
            placeholder={t("searchPlaceholder")}
            size="sm"
            pl={8}
            pr={8}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <Icon
            as={Search}
            boxSize={4}
            color="gray.400"
            position="absolute"
            left={2}
            top="50%"
            transform="translateY(-50%)"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
              }}
            >
              <Icon as={X} boxSize={4} />
            </button>
          )}
        </Box>

        {/* 중복의심만 토글 */}
        <label
          htmlFor="dup-only-toggle"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            userSelect: "none",
            fontSize: 12,
            color: value.duplicateOnly ? "#dc2626" : "#4b5563",
            fontWeight: value.duplicateOnly ? 600 : 400,
          }}
        >
          <input
            id="dup-only-toggle"
            type="checkbox"
            checked={!!value.duplicateOnly}
            onChange={(e) => patch({ duplicateOnly: e.target.checked })}
            style={{ cursor: "pointer" }}
          />
          중복의심만
        </label>

        {/* 초기화 */}
        <Button
          size="sm"
          variant="ghost"
          color="gray.600"
          onClick={handleReset}
          height="32px"
        >
          {t("reset")}
        </Button>
      </Flex>
    </Box>
  );
}
