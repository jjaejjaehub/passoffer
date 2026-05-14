"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type { ChannelRecord } from "./channelQueries";

export type FieldSource = "master" | "variant" | "channel-only";
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "image"
  | "date";

export interface FieldSpec {
  key: string;
  label: string;
  required: boolean;
  source: FieldSource;
  type: FieldType;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  masterPath?: string;
}

export interface MissingField {
  key: string;
  label: string;
  source: FieldSource;
  type: FieldType;
  description?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface ResolvedField {
  key: string;
  value: unknown;
  source: FieldSource | "override";
  fromMaster: boolean;
  overridden: boolean;
}

export interface FieldSpecsResponse {
  channelType: ChannelRecord["channelType"];
  specs: FieldSpec[];
}

export interface ValidateListingResponse {
  valid: boolean;
  missing: MissingField[];
  mergedOverrides: Record<string, unknown>;
}

export interface ResolveListingResponse {
  channelType: ChannelRecord["channelType"];
  payload: Record<string, unknown>;
  resolved: ResolvedField[];
  missing: MissingField[];
  ready: boolean;
  mergedOverrides: Record<string, unknown>;
}

export interface OverridesResponse {
  overrides: Record<string, unknown>;
}

export function useChannelFieldSpecs(channelId: string | undefined) {
  return useQuery({
    queryKey: ["channels", channelId, "field-specs"],
    queryFn: () =>
      http.get<FieldSpecsResponse>(`/api/channels/${channelId}/field-specs`),
    enabled: !!channelId,
    staleTime: 5 * 60_000,
  });
}

interface ValidateListingArgs {
  masterProductId: string;
  variantId?: string;
  overrides?: Record<string, unknown>;
}

export function useValidateListing(channelId: string | undefined) {
  return useMutation({
    mutationFn: (args: ValidateListingArgs) =>
      http.post<ValidateListingResponse>(
        `/api/channels/${channelId}/validate-listing`,
        args,
      ),
  });
}

export function useResolveListing(channelId: string | undefined) {
  return useMutation({
    mutationFn: (args: ValidateListingArgs) =>
      http.post<ResolveListingResponse>(
        `/api/channels/${channelId}/resolve-listing`,
        args,
      ),
  });
}

export function useChannelOverrides(
  masterProductId: string | undefined,
  channelId: string | undefined,
) {
  return useQuery({
    queryKey: [
      "master-products",
      masterProductId,
      "channels",
      channelId,
      "overrides",
    ],
    queryFn: () =>
      http.get<OverridesResponse>(
        `/api/master-products/${masterProductId}/channels/${channelId}/overrides`,
      ),
    enabled: !!masterProductId && !!channelId,
  });
}

export function useUpsertChannelOverrides(
  masterProductId: string,
  channelId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrides: Record<string, unknown>) =>
      http.put<OverridesResponse>(
        `/api/master-products/${masterProductId}/channels/${channelId}/overrides`,
        { overrides },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "master-products",
          masterProductId,
          "channels",
          channelId,
          "overrides",
        ],
      });
    },
  });
}

export function useDeleteChannelOverrides(
  masterProductId: string,
  channelId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      http.delete<{ success: true }>(
        `/api/master-products/${masterProductId}/channels/${channelId}/overrides`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "master-products",
          masterProductId,
          "channels",
          channelId,
          "overrides",
        ],
      });
    },
  });
}
