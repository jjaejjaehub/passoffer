import { z } from "zod";

export const CARRIER_OPTIONS = [
  { id: "cj", name: "CJ대한통운" },
  { id: "lotte", name: "롯데택배" },
  { id: "hanjin", name: "한진택배" },
  { id: "epost", name: "우체국택배" },
  { id: "etc", name: "기타" },
] as const;

export type CarrierId = (typeof CARRIER_OPTIONS)[number]["id"];

export const trackingSchema = z.object({
  expectedShipDate: z.string().optional(),
  carrierId: z.enum(["cj", "lotte", "hanjin", "epost", "etc"]).optional(),
  trackingNumber: z
    .string()
    .regex(/^[\d\-]*$/, "숫자와 하이픈(-)만 입력 가능합니다")
    .optional(),
  sendToChannel: z.boolean().optional(),
  memo: z.string().max(200, "200자 이내로 입력해 주세요").optional(),
});

export type TrackingFormValues = z.infer<typeof trackingSchema>;
