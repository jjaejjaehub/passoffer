import { z } from "zod";

export const itemEditImageSchema = z.object({
  standardImage: z.string().url("올바른 이미지 URL을 입력하세요").max(200),
  videoURL: z
    .string()
    .url("올바른 동영상 URL을 입력하세요")
    .max(200)
    .optional()
    .or(z.literal("")),
});

export const itemEditContentsSchema = z.object({
  contents: z.string().min(1, "상품 상세 내용을 입력하세요"),
});
