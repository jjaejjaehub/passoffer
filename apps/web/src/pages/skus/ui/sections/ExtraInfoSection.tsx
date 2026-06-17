import { Flex, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import type { FormState } from "../../model/formState";
import { Field, FormBox, TwoCol } from "./primitives";

interface Props {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

export function ExtraInfoSection({ state, update }: Props) {
  const t = useTranslations("pages.skus");
  return (
    <FormBox>
      <Stack gap={4}>
        <TwoCol>
          <Field label={t("form.extra.originCountry")}>
            <Input size="sm" value={state.originCountry} onChange={(e) => update("originCountry", e.target.value)} />
          </Field>
          <Field label={t("form.extra.taxType")}>
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
              <option value="GENERAL">{t("form.extra.taxTypeGeneral")}</option>
              <option value="ZERO">{t("form.extra.taxTypeZero")}</option>
              <option value="EXEMPT">{t("form.extra.taxTypeExempt")}</option>
            </select>
          </Field>
        </TwoCol>

        <Field label={t("form.extra.requiresCaution")}>
          <Flex align="center" gap={2}>
            <input
              type="checkbox"
              checked={state.requiresCaution}
              onChange={(e) => update("requiresCaution", e.target.checked)}
            />
            <Text fontSize="sm" color="gray.600">{t("form.extra.requiresCautionHint")}</Text>
          </Flex>
        </Field>

        <TwoCol>
          <Field label={t("form.extra.brand")}>
            <Input size="sm" value={state.brand} onChange={(e) => update("brand", e.target.value)} />
          </Field>
          <Field label={t("form.extra.manufacturer")}>
            <Input size="sm" value={state.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label={t("form.extra.manufacturerEn")}>
            <Input size="sm" value={state.manufacturerEn} onChange={(e) => update("manufacturerEn", e.target.value)} maxLength={40} />
          </Field>
          <Field label={t("form.extra.ageGroup")}>
            <Input size="sm" value={state.ageGroup} onChange={(e) => update("ageGroup", e.target.value)} placeholder={t("form.extra.ageGroupPlaceholder")} />
          </Field>
        </TwoCol>

        <Field label={t("form.extra.mainImage")}>
          <Input size="sm" value={state.mainImage} onChange={(e) => update("mainImage", e.target.value)} placeholder="https://..." />
        </Field>
        <Field label={t("form.extra.descriptionHtml")}>
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
