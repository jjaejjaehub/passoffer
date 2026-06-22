import { Flex, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pages.skus");
  return (
    <FormBox>
      <Stack gap={4}>
        <TwoCol>
          <Field label={t("form.basic.code")} required>
            <Input
              size="sm"
              value={state.code}
              onChange={(e) => update("code", e.target.value)}
              placeholder={t("form.basic.codePlaceholder")}
              disabled={mode === "bulk"}
            />
            {mode === "bulk" ? (
              <HelperText>{t("form.basic.codeHelperBulk")}</HelperText>
            ) : (
              <HelperText>{t("form.basic.codeHelperSingle")}</HelperText>
            )}
          </Field>
          <Field label={t("form.basic.name")}>
            <Input
              size="sm"
              value={state.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("form.basic.namePlaceholder")}
            />
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label={t("form.basic.modelName")}>
            <Input
              size="sm"
              value={state.modelName}
              onChange={(e) => update("modelName", e.target.value)}
            />
          </Field>
          <Field label={t("form.basic.inventoryCode")}>
            <Input
              size="sm"
              value={state.inventoryCode}
              onChange={(e) => update("inventoryCode", e.target.value)}
            />
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label={t("form.basic.warehouse")}>
            <Input
              size="sm"
              value={state.warehouseText}
              onChange={(e) => update("warehouseText", e.target.value)}
            />
            <HelperText>{t("form.basic.todoNote")}</HelperText>
          </Field>
          <Field label={t("form.basic.vendor")}>
            <Input
              size="sm"
              value={state.vendorText}
              onChange={(e) => update("vendorText", e.target.value)}
            />
            <HelperText>{t("form.basic.todoNote")}</HelperText>
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label={t("form.basic.leadTimeDays")}>
            <Input
              size="sm"
              type="number"
              value={state.leadTimeDays}
              onChange={(e) => update("leadTimeDays", e.target.value)}
              min={0}
            />
          </Field>
          <Field label={t("form.basic.safetyStock")}>
            <Input
              size="sm"
              type="number"
              value={state.safetyStock}
              onChange={(e) => update("safetyStock", e.target.value)}
              min={0}
            />
          </Field>
        </TwoCol>

        <Field label={t("form.basic.isPrimaryWarehouse")}>
          <Flex align="center" gap={2}>
            <input
              type="checkbox"
              checked={state.isPrimaryWarehouse}
              onChange={(e) => update("isPrimaryWarehouse", e.target.checked)}
            />
            <Text fontSize="sm" color="gray.600">
              {t("form.basic.isPrimaryWarehouseHint")}
            </Text>
          </Flex>
        </Field>

        <TwoCol>
          <Field label={t("form.basic.image")}>
            <Input
              size="sm"
              value={state.image}
              onChange={(e) => update("image", e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <Field label={t("form.basic.barcode")}>
            <Input
              size="sm"
              value={state.barcode}
              onChange={(e) => update("barcode", e.target.value)}
              placeholder={t("form.basic.barcodePlaceholder")}
            />
          </Field>
        </TwoCol>

        <TwoCol>
          <Field label={t("form.basic.standardCode")}>
            <Input
              size="sm"
              value={state.standardCode}
              onChange={(e) => update("standardCode", e.target.value)}
            />
          </Field>
          <Field label={t("form.basic.hsCode")}>
            <Input
              size="sm"
              value={state.hsCode}
              onChange={(e) => update("hsCode", e.target.value)}
            />
          </Field>
        </TwoCol>

        <Field label={t("form.basic.isbn")}>
          <Input
            size="sm"
            value={state.isbn}
            onChange={(e) => update("isbn", e.target.value)}
            maxLength={13}
          />
        </Field>

        {!isEdit && mode === "single" && (
          <Field label={t("form.basic.initialStock")}>
            <Input
              size="sm"
              type="number"
              value={state.initialStock}
              onChange={(e) => update("initialStock", e.target.value)}
              min={0}
            />
            <HelperText>{t("form.basic.initialStockHelper")}</HelperText>
          </Field>
        )}

        <Field label={t("form.basic.attributes")}>
          <Textarea
            value={state.attributesJson}
            onChange={(e) => update("attributesJson", e.target.value)}
            placeholder='{ "color": "red" }'
            rows={4}
            fontFamily="mono"
            fontSize="sm"
          />
          <HelperText>{t("form.basic.attributesHelper")}</HelperText>
        </Field>
      </Stack>
    </FormBox>
  );
}
