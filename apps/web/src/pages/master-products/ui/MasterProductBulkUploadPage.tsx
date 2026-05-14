"use client";

import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useState } from "react";
import {
  type BulkCreateResult,
  type BulkMasterProductItem,
  downloadMasterProductTemplate,
  useBulkCreateMasterProducts,
} from "@/entities/master-product";
import {
  type ParsedMasterProductItem,
  type ParseMasterProductsResult,
  parseMasterProductExcel,
} from "@/entities/master-product/lib/parseMasterProductExcel";
import {
  MasterProductExcelDropzone,
  MasterProductPreviewTable,
} from "@/features/master-product-bulk-upload";
import { ROUTES } from "@/shared/config";
import { PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";

function toBulkItem(item: ParsedMasterProductItem): BulkMasterProductItem {
  return {
    code: item.code,
    title: item.title,
    descriptionHtml: item.descriptionHtml,
    brand: item.brand,
    hsCode: item.hsCode,
    countryOfOrigin: item.countryOfOrigin,
    material: item.material,
    weightG: item.weightG,
    retailPrice: item.retailPrice,
    tags: item.tags,
    images: item.images,
    optionGroups: item.optionGroups,
    variants: item.variants?.map((v) => ({
      sku: v.sku,
      price: v.price,
      stock: v.stock ?? 0,
      optionValues: v.optionValues,
    })),
  };
}

export function MasterProductBulkUploadPage(): ReactElement {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] =
    useState<ParseMasterProductsResult | null>(null);
  const [results, setResults] = useState<BulkCreateResult[] | null>(null);
  const [submitSummary, setSubmitSummary] = useState<{
    total: number;
    successCount: number;
    failureCount: number;
  } | null>(null);

  const { mutateAsync: bulkCreate, isPending: submitting } =
    useBulkCreateMasterProducts();

  const handleFile = async (file: File): Promise<void> => {
    setParsing(true);
    setFileName(file.name);
    setResults(null);
    setSubmitSummary(null);
    try {
      const result = await parseMasterProductExcel(file);
      setParseResult(result);
      if (result.errors.length > 0) {
        appToaster.create({
          title: `${result.items.length}개 추출, ${result.errors.length}개 행 오류`,
          type: "warning",
        });
      } else {
        appToaster.create({
          title: `${result.items.length}개 상품을 추출했습니다.`,
          type: "success",
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "파일 파싱에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  };

  const handleReset = (): void => {
    setFileName(null);
    setParseResult(null);
    setResults(null);
    setSubmitSummary(null);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!parseResult || parseResult.items.length === 0) return;
    try {
      const payload = parseResult.items.map(toBulkItem);
      const response = await bulkCreate(payload);
      setResults(response.results);
      setSubmitSummary({
        total: response.total,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
      if (response.failureCount === 0) {
        appToaster.create({
          title: `${response.successCount}개 상품 등록 완료`,
          type: "success",
        });
      } else {
        appToaster.create({
          title: `${response.successCount}개 성공 / ${response.failureCount}개 실패`,
          type: "warning",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "등록 요청 실패";
      appToaster.create({ title: msg, type: "error" });
    }
  };

  const items = parseResult?.items ?? [];
  const errors = parseResult?.errors ?? [];
  const canSubmit = !submitting && items.length > 0 && results === null;

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Flex align="flex-start" justify="space-between" mb={4}>
        <Stack gap={2}>
          <Button
            size="xs"
            variant="ghost"
            color="gray.600"
            onClick={() => router.push(ROUTES.masterProducts)}
            gap={1}
            alignSelf="flex-start"
            px={1}
          >
            <ArrowLeft size={12} />
            마스터 상품 목록
          </Button>
          <PageHeader
            title="마스터 상품 일괄 등록"
            description="엑셀(xlsx/csv) 파일을 업로드해 여러 마스터 상품을 한 번에 등록합니다."
          />
        </Stack>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          color="gray.700"
          _hover={{ bg: "gray.50" }}
          gap={2}
          mt={1}
          onClick={() => downloadMasterProductTemplate()}
        >
          <Download size={14} />
          템플릿 다운로드
        </Button>
      </Flex>

      <Stack gap={6}>
        <MasterProductExcelDropzone
          onFile={(f) => {
            void handleFile(f);
          }}
          disabled={parsing || submitting}
        />

        {fileName !== null && (
          <Flex
            align="center"
            justify="space-between"
            px={3}
            py={2}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="gray.50"
          >
            <Stack gap={0}>
              <Text fontSize="sm" fontWeight="medium">
                {fileName}
              </Text>
              <Text fontSize="xs" color="gray.500">
                추출 행 {parseResult?.rowCount ?? 0} / 상품 {items.length}
                {errors.length > 0 ? ` / 오류 ${errors.length}` : ""}
              </Text>
            </Stack>
            <Button
              size="xs"
              variant="outline"
              onClick={handleReset}
              disabled={submitting}
            >
              초기화
            </Button>
          </Flex>
        )}

        {errors.length > 0 && (
          <Box
            borderWidth="1px"
            borderColor="red.200"
            bg="red.50"
            borderRadius="md"
            p={3}
          >
            <Text fontSize="sm" fontWeight="semibold" color="red.700" mb={2}>
              파싱 오류 {errors.length}건
            </Text>
            <Stack gap={1} maxH="200px" overflowY="auto">
              {errors.map((e, i) => (
                <Text key={i} fontSize="xs" color="red.700">
                  · 행 {e.rowIndex}: {e.message}
                </Text>
              ))}
            </Stack>
          </Box>
        )}

        {parseResult !== null && (
          <Box>
            <Flex align="center" justify="space-between" mb={3}>
              <Text fontSize="sm" color="gray.700">
                미리보기 ({items.length})
                {submitSummary !== null && (
                  <>
                    {" · "}
                    <Text as="span" color="green.700">
                      성공 {submitSummary.successCount}
                    </Text>
                    {" / "}
                    <Text as="span" color="red.700">
                      실패 {submitSummary.failureCount}
                    </Text>
                  </>
                )}
              </Text>
              <Flex gap={2}>
                {results !== null && submitSummary?.successCount ? (
                  <Button
                    size="sm"
                    bg="gray.900"
                    color="white"
                    _hover={{ bg: "gray.800" }}
                    onClick={() => router.push(ROUTES.masterProducts)}
                  >
                    목록으로 이동
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    bg="gray.900"
                    color="white"
                    _hover={{ bg: "gray.800" }}
                    loading={submitting}
                    disabled={!canSubmit}
                    onClick={() => void handleSubmit()}
                  >
                    {items.length}개 등록 실행
                  </Button>
                )}
              </Flex>
            </Flex>
            <MasterProductPreviewTable
              items={items}
              results={results ?? undefined}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
