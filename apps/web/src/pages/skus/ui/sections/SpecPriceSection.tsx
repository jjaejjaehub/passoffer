import { Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import type { FormState } from "../../model/formState";
import { Field, FormBox, SubHeading, TwoCol } from "./primitives";

interface Props {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

export function SpecPriceSection({ state, update }: Props) {
  const t = useTranslations("pages.skus");
  return (
    <FormBox>
      <Stack gap={5}>
        <SubHeading>{t("form.spec.headingSpec")}</SubHeading>
        <TwoCol>
          <Field label={t("form.spec.widthCm")}>
            <Input
              size="sm"
              value={state.widthCm}
              onChange={(e) => update("widthCm", e.target.value)}
            />
          </Field>
          <Field label={t("form.spec.heightCm")}>
            <Input
              size="sm"
              value={state.heightCm}
              onChange={(e) => update("heightCm", e.target.value)}
            />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label={t("form.spec.depthCm")}>
            <Input
              size="sm"
              value={state.depthCm}
              onChange={(e) => update("depthCm", e.target.value)}
            />
          </Field>
          <Field label={t("form.spec.weightKg")}>
            <Input
              size="sm"
              value={state.weightKg}
              onChange={(e) => update("weightKg", e.target.value)}
            />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label={t("form.spec.inboundUnit")}>
            <Input
              size="sm"
              value={state.inboundUnit}
              onChange={(e) => update("inboundUnit", e.target.value)}
            />
          </Field>
          <Field label={t("form.spec.inboundUnitType")}>
            <Input
              size="sm"
              value={state.inboundUnitType}
              onChange={(e) => update("inboundUnitType", e.target.value)}
              placeholder={t("form.spec.inboundUnitTypePlaceholder")}
            />
          </Field>
        </TwoCol>
        <Field label={t("form.spec.isBundlable")}>
          <Flex align="center" gap={2}>
            <input
              type="checkbox"
              checked={state.isBundlable}
              onChange={(e) => update("isBundlable", e.target.checked)}
            />
            <Text fontSize="sm" color="gray.600">
              {t("form.spec.isBundlableHint")}
            </Text>
          </Flex>
        </Field>

        <SubHeading>{t("form.spec.headingPrice")}</SubHeading>
        <TwoCol>
          <Field label={t("form.spec.purchaseCost")}>
            <Input
              size="sm"
              value={state.purchaseCost}
              onChange={(e) => update("purchaseCost", e.target.value)}
            />
          </Field>
          <Field label={t("form.spec.purchaseFreight")}>
            <Input
              size="sm"
              value={state.purchaseFreight}
              onChange={(e) => update("purchaseFreight", e.target.value)}
            />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label={t("form.spec.deliveryFee")}>
            <Input
              size="sm"
              value={state.deliveryFee}
              onChange={(e) => update("deliveryFee", e.target.value)}
            />
          </Field>
          <Field label={t("form.spec.adCost")}>
            <Input
              size="sm"
              value={state.adCost}
              onChange={(e) => update("adCost", e.target.value)}
            />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label={t("form.spec.etcCost")}>
            <Input
              size="sm"
              value={state.etcCost}
              onChange={(e) => update("etcCost", e.target.value)}
            />
          </Field>
          <Field label={t("form.spec.currency")}>
            <Input
              size="sm"
              value={state.currency}
              onChange={(e) => update("currency", e.target.value)}
              placeholder={t("form.spec.currencyPlaceholder")}
            />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label={t("form.spec.supplyPrice")}>
            <Input
              size="sm"
              value={state.supplyPrice}
              onChange={(e) => update("supplyPrice", e.target.value)}
            />
          </Field>
          <Field label={t("form.spec.salePrice")}>
            <Input
              size="sm"
              value={state.salePrice}
              onChange={(e) => update("salePrice", e.target.value)}
            />
          </Field>
        </TwoCol>
      </Stack>
    </FormBox>
  );
}
