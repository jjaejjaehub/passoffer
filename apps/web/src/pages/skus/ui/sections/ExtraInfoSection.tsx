import { Flex, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import type { FormState } from "../../model/formState";
import { Field, FormBox, TwoCol } from "./primitives";

interface Props {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

export function ExtraInfoSection({ state, update }: Props) {
  return (
    <FormBox>
      <Stack gap={4}>
        <TwoCol>
          <Field label="원산지">
            <Input size="sm" value={state.originCountry} onChange={(e) => update("originCountry", e.target.value)} />
          </Field>
          <Field label="세금 유형">
            <select
              value={state.taxType}
              onChange={(e) => update("taxType", e.target.value as FormState["taxType"])}
              style={{
                width: "100%",
                height: "32px",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                paddingLeft: "8px",
                fontSize: "14px",
              }}
            >
              <option value="GENERAL">일반과세</option>
              <option value="ZERO">영세율</option>
              <option value="EXEMPT">면세</option>
            </select>
          </Field>
        </TwoCol>

        <Field label="취급 주의 상품">
          <Flex align="center" gap={2}>
            <input
              type="checkbox"
              checked={state.requiresCaution}
              onChange={(e) => update("requiresCaution", e.target.checked)}
            />
            <Text fontSize="sm" color="gray.600">파손 위험·취급 주의가 필요한 상품</Text>
          </Flex>
        </Field>

        <TwoCol>
          <Field label="브랜드">
            <Input size="sm" value={state.brand} onChange={(e) => update("brand", e.target.value)} />
          </Field>
          <Field label="제조사">
            <Input size="sm" value={state.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="제조사 (영문)">
            <Input size="sm" value={state.manufacturerEn} onChange={(e) => update("manufacturerEn", e.target.value)} maxLength={40} />
          </Field>
          <Field label="연령대">
            <Input size="sm" value={state.ageGroup} onChange={(e) => update("ageGroup", e.target.value)} placeholder="성인 / 유아 등" />
          </Field>
        </TwoCol>

        <Field label="대표 이미지 URL">
          <Input size="sm" value={state.mainImage} onChange={(e) => update("mainImage", e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="상품 설명 (HTML)">
          <Textarea
            value={state.descriptionHtml}
            onChange={(e) => update("descriptionHtml", e.target.value)}
            rows={6}
            fontFamily="mono"
            fontSize="sm"
          />
        </Field>
      </Stack>
    </FormBox>
  );
}
