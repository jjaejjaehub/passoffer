import { Flex, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { ShopifyFormHelperText as HelperText } from "@/shared/ui/ShopifyFormPrimitives";
import type { FormState, Mode } from "../../model/formState";
import { Field, FormBox, TwoCol } from "./primitives";

interface Props {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  mode: Mode;
  isEdit: boolean;
}

export function BasicInfoSection({ state, update, mode, isEdit }: Props) {
  return (
    <FormBox>
      <Stack gap={4}>
        <TwoCol>
          <Field label="SKU 코드" required>
            <Input
              size="sm"
              value={state.code}
              onChange={(e) => update("code", e.target.value)}
              placeholder="예: APPLE-RED-M"
              disabled={mode === "bulk"}
            />
            {mode === "bulk" ? (
              <HelperText>대량 등록은 아래 [대량 옵션] 탭에서 코드 prefix와 속성 축을 설정합니다.</HelperText>
            ) : (
              <HelperText>테넌트 내에서 유일해야 합니다.</HelperText>
            )}
          </Field>
          <Field label="이름">
            <Input
              size="sm"
              value={state.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="SKU 표시명"
            />
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label="모델명">
            <Input
              size="sm"
              value={state.modelName}
              onChange={(e) => update("modelName", e.target.value)}
            />
          </Field>
          <Field label="재고관리코드">
            <Input
              size="sm"
              value={state.inventoryCode}
              onChange={(e) => update("inventoryCode", e.target.value)}
            />
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label="배송처">
            <Input
              size="sm"
              value={state.warehouseText}
              onChange={(e) => update("warehouseText", e.target.value)}
            />
            <HelperText>※ 추후 작업 예정 (현재는 텍스트 메모)</HelperText>
          </Field>
          <Field label="매입처">
            <Input
              size="sm"
              value={state.vendorText}
              onChange={(e) => update("vendorText", e.target.value)}
            />
            <HelperText>※ 추후 작업 예정 (현재는 텍스트 메모)</HelperText>
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label="입고 소요일 (일)">
            <Input
              size="sm"
              type="number"
              value={state.leadTimeDays}
              onChange={(e) => update("leadTimeDays", e.target.value)}
              min={0}
            />
          </Field>
          <Field label="안전재고">
            <Input
              size="sm"
              type="number"
              value={state.safetyStock}
              onChange={(e) => update("safetyStock", e.target.value)}
              min={0}
            />
          </Field>
        </TwoCol>

        <Field label="대표 배송처로 사용">
          <Flex align="center" gap={2}>
            <input
              type="checkbox"
              checked={state.isPrimaryWarehouse}
              onChange={(e) => update("isPrimaryWarehouse", e.target.checked)}
            />
            <Text fontSize="sm" color="gray.600">대표 배송처로 지정</Text>
          </Flex>
        </Field>

        <TwoCol>
          <Field label="이미지 URL">
            <Input
              size="sm"
              value={state.image}
              onChange={(e) => update("image", e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <Field label="바코드">
            <Input
              size="sm"
              value={state.barcode}
              onChange={(e) => update("barcode", e.target.value)}
              placeholder="EAN/UPC 등"
            />
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label="표준코드">
            <Input
              size="sm"
              value={state.standardCode}
              onChange={(e) => update("standardCode", e.target.value)}
            />
          </Field>
          <Field label="HS 코드">
            <Input
              size="sm"
              value={state.hsCode}
              onChange={(e) => update("hsCode", e.target.value)}
            />
          </Field>
        </TwoCol>

        <Field label="ISBN">
          <Input
            size="sm"
            value={state.isbn}
            onChange={(e) => update("isbn", e.target.value)}
            maxLength={13}
          />
        </Field>

        {!isEdit && mode === "single" && (
          <Field label="초기 재고">
            <Input
              size="sm"
              type="number"
              value={state.initialStock}
              onChange={(e) => update("initialStock", e.target.value)}
              min={0}
            />
            <HelperText>등록 후 재고 변경은 재고 조정(ledger)으로만 가능합니다.</HelperText>
          </Field>
        )}

        <Field label="속성 (JSON)">
          <Textarea
            value={state.attributesJson}
            onChange={(e) => update("attributesJson", e.target.value)}
            placeholder='{ "color": "red" }'
            rows={4}
            fontFamily="mono"
            fontSize="sm"
          />
          <HelperText>임의의 키/값 메타데이터. 대량 등록 시 축별 값이 자동 병합됩니다.</HelperText>
        </Field>
      </Stack>
    </FormBox>
  );
}
