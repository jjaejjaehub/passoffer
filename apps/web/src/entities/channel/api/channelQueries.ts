"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type { ConnectionStatus } from "@oms/types";

export interface ChannelRecord {
  id: string;
  channelType: "QOO10_JP" | "SHOPEE" | "RAKUTEN" | "SHOPIFY" | "CUSTOM";
  name: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  createdAt: string;
  updatedAt: string;
}

export interface PlatformConstraintField {
  maxLength?: number;
  minLength?: number;
  forbiddenChars?: string[];
  forbiddenPattern?: string;
  min?: number;
  max?: number;
  maxCount?: number;
  currency?: string;
  note?: string;
}

export interface PlatformConstraints {
  title: PlatformConstraintField;
  description: PlatformConstraintField;
  sku: PlatformConstraintField;
  price: PlatformConstraintField;
  images: PlatformConstraintField;
  tags?: PlatformConstraintField;
  brand?: PlatformConstraintField;
  weight?: PlatformConstraintField;
}

export interface ChannelRequiredField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: Array<{ value: string; label: string }>;
  conditionalOptions?: {
    dependsOn: string;
    values: string[];
    options: Array<{ value: string; label: string }>;
  };
  note?: string;
}

export interface PlatformConstraintsResponse {
  constraints: Record<string, PlatformConstraints>;
  requiredFields: Record<string, ChannelRequiredField[]>;
}

export function useChannels() {
  return useQuery({
    queryKey: ["channels", "list"],
    queryFn: () => http.get<ChannelRecord[]>("/api/channels"),
  });
}

export function usePlatformConstraints() {
  return useQuery({
    queryKey: ["platform-constraints"],
    queryFn: () =>
      http.get<PlatformConstraintsResponse>("/api/platform-constraints"),
    staleTime: Infinity,
  });
}

export interface ChannelHealth {
  status: ConnectionStatus;
  latencyMs?: number;
  checkedAt: string;
  message?: string;
}

export function useChannelHealth(channelId: string | undefined) {
  return useQuery({
    queryKey: ["channels", "health", channelId],
    queryFn: () => http.get<ChannelHealth>(`/api/channels/${channelId}/health`),
    enabled: !!channelId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
