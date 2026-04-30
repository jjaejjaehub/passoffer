"use client";

import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { Upload } from "lucide-react";

interface ExcelUploadDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const ACCEPTED_EXTS = [".xlsx", ".xls", ".csv"];

function isAcceptedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTS.some((ext) => lower.endsWith(ext));
}

export function ExcelUploadDropzone({
  onFile,
  disabled = false,
  disabledReason,
}: ExcelUploadDropzoneProps): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick(): void {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setError("xlsx, xls, csv 파일만 업로드할 수 있습니다.");
      return;
    }
    setError(null);
    onFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(): void {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setError("xlsx, xls, csv 파일만 업로드할 수 있습니다.");
      return;
    }
    setError(null);
    onFile(file);
  }

  return (
    <Box>
      <Box
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? "blue.400" : "gray.300"}
        borderRadius="lg"
        bg={isDragging ? "blue.50" : disabled ? "gray.50" : "white"}
        cursor={disabled ? "not-allowed" : "pointer"}
        opacity={disabled ? 0.6 : 1}
        py={10}
        px={6}
        transition="all 120ms ease"
        title={disabled ? disabledReason : undefined}
        aria-disabled={disabled}
      >
        <Flex direction="column" align="center" gap={2}>
          <Upload size={28} color="#6b7280" />
          <Text fontWeight="medium" color="gray.700">
            엑셀 파일을 드래그하거나 클릭하여 업로드
          </Text>
          <Text fontSize="xs" color="gray.500">
            지원 형식: xlsx, xls, csv · 필수 컬럼: master_product_code, quantity, expected_at
          </Text>
          <Button
            mt={2}
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            파일 선택
          </Button>
        </Flex>
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleChange}
        hidden
      />
      {error !== null ? (
        <Text mt={2} fontSize="xs" color="red.600">
          {error}
        </Text>
      ) : null}
      {disabled && disabledReason !== undefined ? (
        <Text mt={2} fontSize="xs" color="gray.500">
          {disabledReason}
        </Text>
      ) : null}
    </Box>
  );
}
