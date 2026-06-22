"use client";

import { Box, Button, Flex, Heading, Text, Textarea } from "@chakra-ui/react";
import type { CSSProperties } from "react";
import { useState } from "react";

// ─── Section ──────────────────────────────────────────────────

export function ShopifyFormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="white"
      p={5}
    >
      <Heading as="h2" size="md" mb={4}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

// ─── Label ────────────────────────────────────────────────────

export function ShopifyFormLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}): React.JSX.Element {
  return (
    <Text fontSize="sm" fontWeight="medium" mb={1}>
      {children}{" "}
      {required && (
        <Text as="span" color="gray.400">
          *
        </Text>
      )}
    </Text>
  );
}

// ─── HelperText ───────────────────────────────────────────────

export function ShopifyFormHelperText({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Text fontSize="xs" color="gray.400" mt={1}>
      {children}
    </Text>
  );
}

// ─── ErrorMsg ─────────────────────────────────────────────────

export function ShopifyFormErrorMsg({
  children,
}: {
  children?: string;
}): React.JSX.Element | null {
  if (!children) return null;
  return (
    <Text fontSize="xs" color="red.500" mt={1}>
      {children}
    </Text>
  );
}

// ─── NativeSelect ─────────────────────────────────────────────

type NativeSelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "size"
> & {
  placeholder?: string;
  size?: "sm" | "md";
  isDisabled?: boolean;
};

export function ShopifyNativeSelect({
  placeholder,
  size = "sm",
  isDisabled,
  style,
  children,
  ...rest
}: NativeSelectProps): React.JSX.Element {
  const mergedStyle: CSSProperties = {
    width: "100%",
    border: "1px solid",
    borderColor: "#E2E8F0",
    borderRadius: "6px",
    padding: size === "sm" ? "6px 10px" : "8px 12px",
    backgroundColor: isDisabled ? "#F7FAFC" : "white",
    color: "#1A202C",
    fontSize: size === "sm" ? "14px" : "15px",
    outline: "none",
    cursor: isDisabled ? "not-allowed" : "default",
    ...style,
  };
  return (
    <select {...rest} disabled={isDisabled} style={mergedStyle}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

// ─── HtmlEditor ───────────────────────────────────────────────

export function ShopifyHtmlEditor({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}): React.JSX.Element {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <Box>
      <Flex mb={2} borderBottomWidth="1px" borderColor="gray.200">
        {(["write", "preview"] as const).map((t) => (
          <Button
            key={t}
            variant="ghost"
            size="sm"
            height="auto"
            px={3}
            py={2}
            borderRadius={0}
            fontWeight={tab === t ? "semibold" : "normal"}
            color={tab === t ? "gray.900" : "gray.500"}
            borderBottomWidth="2px"
            borderBottomColor={tab === t ? "gray.900" : "transparent"}
            mb="-1px"
            _hover={{ bg: "transparent", color: "gray.900" }}
            onClick={() => setTab(t)}
            disabled={disabled && t === "write"}
          >
            {t === "write" ? "입력" : "미리보기"}
          </Button>
        ))}
      </Flex>

      {tab === "write" ? (
        <>
          <Textarea
            size="sm"
            rows={10}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={
              "상품 설명을 입력해 주세요.\nHTML 태그를 사용할 수 있습니다.\n\n예시:\n<p>고품질 소재로 제작된 상품입니다.</p>\n<ul>\n  <li>소재: 면 100%</li>\n  <li>세탁: 손세탁 권장</li>\n</ul>"
            }
            fontFamily="mono"
            fontSize="xs"
          />
          <ShopifyFormHelperText>
            {"<p>, <b>, <ul>, <li>, <img> 등 HTML 태그를 사용할 수 있습니다."}
          </ShopifyFormHelperText>
          <ShopifyFormErrorMsg>{error}</ShopifyFormErrorMsg>
        </>
      ) : (
        <Box
          minH="200px"
          p={3}
          borderWidth="1px"
          borderRadius="md"
          borderColor="gray.200"
          fontSize="sm"
          color="gray.800"
          bg="white"
          overflowY="auto"
          maxH="400px"
        >
          {value ? (
            <Box dangerouslySetInnerHTML={{ __html: value }} />
          ) : (
            <Text color="gray.300" fontSize="sm">
              미리보기할 내용이 없습니다.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
