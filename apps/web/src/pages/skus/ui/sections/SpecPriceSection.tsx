import { Flex, Input, Stack, Text } from "@chakra-ui/react";
import type { FormState } from "../../model/formState";
import { Field, FormBox, SubHeading, TwoCol } from "./primitives";

interface Props {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

export function SpecPriceSection({ state, update }: Props) {
  return (
    <FormBox>
      <Stack gap={5}>
        <SubHeading>규격</SubHeading>
        <TwoCol>
          <Field label="가로 (cm)">
            <Input size="sm" value={state.widthCm} onChange={(e) => update("widthCm", e.target.value)} />
          </Field>
          <Field label="세로 (cm)">
            <Input size="sm" value={state.heightCm} onChange={(e) => update("heightCm", e.target.value)} />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="높이 (cm)">
            <Input size="sm" value={state.depthCm} onChange={(e) => update("depthCm", e.target.value)} />
          </Field>
          <Field label="무게 (kg)">
            <Input size="sm" value={state.weightKg} onChange={(e) => update("weightKg", e.target.value)} />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="입수 수량">
            <Input size="sm" value={state.inboundUnit} onChange={(e) => update("inboundUnit", e.target.value)} />
          </Field>
          <Field label="입수 단위">
            <Input size="sm" value={state.inboundUnitType} onChange={(e) => update("inboundUnitType", e.target.value)} placeholder="EA / BOX 등" />
          </Field>
        </TwoCol>
        <Field label="합포장 가능 여부">
          <Flex align="center" gap={2}>
            <input
              type="checkbox"
              checked={state.isBundlable}
              onChange={(e) => update("isBundlable", e.target.checked)}
            />
            <Text fontSize="sm" color="gray.600">다른 SKU와 합포장 허용</Text>
          </Flex>
        </Field>

        <SubHeading>가격</SubHeading>
        <TwoCol>
          <Field label="매입가">
            <Input size="sm" value={state.purchaseCost} onChange={(e) => update("purchaseCost", e.target.value)} />
          </Field>
          <Field label="매입 운송비">
            <Input size="sm" value={state.purchaseFreight} onChange={(e) => update("purchaseFreight", e.target.value)} />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="배송비">
            <Input size="sm" value={state.deliveryFee} onChange={(e) => update("deliveryFee", e.target.value)} />
          </Field>
          <Field label="광고비">
            <Input size="sm" value={state.adCost} onChange={(e) => update("adCost", e.target.value)} />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="기타 비용">
            <Input size="sm" value={state.etcCost} onChange={(e) => update("etcCost", e.target.value)} />
          </Field>
          <Field label="통화">
            <Input size="sm" value={state.currency} onChange={(e) => update("currency", e.target.value)} placeholder="KRW" />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="공급가">
            <Input size="sm" value={state.supplyPrice} onChange={(e) => update("supplyPrice", e.target.value)} />
          </Field>
          <Field label="판매가">
            <Input size="sm" value={state.salePrice} onChange={(e) => update("salePrice", e.target.value)} />
          </Field>
        </TwoCol>
      </Stack>
    </FormBox>
  );
}
