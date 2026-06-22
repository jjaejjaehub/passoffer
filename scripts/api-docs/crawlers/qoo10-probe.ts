#!/usr/bin/env bun
/**
 * Qoo10 RPC ID 탐색: 메서드/클래스 목록 RPC가 있는지 시도
 *
 * 알려진 RPC: APIDevlop.GetQAPIClassMethodInfo, APIDevlop.GetQAPIMethodParamList
 * 추측 후보들을 차례로 호출해보고 d.OutputData.return === 0 인 것 추출.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ENDPOINT =
  "https://developer.qoo10.jp/GMKT.INC.Gsm.Web/swe_DynamicDataService.asmx/ExecuteToDataTable";
const REFERER =
  "https://developer.qoo10.jp/GMKT.INC.Gsm.Web/APIDev/APIDevelopPage.aspx";
const PROJECT_ROOT = resolve(import.meta.dir, "../../..");
const ENV_PATH = resolve(PROJECT_ROOT, ".env.local");

async function loadCookie(): Promise<string> {
  const raw = await readFile(ENV_PATH, "utf-8");
  const m = raw.match(/^QOO10_DEV_COOKIE\s*=\s*['"]([\s\S]*?)['"]\s*$/m);
  if (!m) throw new Error("QOO10_DEV_COOKIE not found");
  return m[1];
}

async function tryRpc(
  cookie: string,
  id: string,
  params: Array<{ Name: string; Value: string }>,
): Promise<{ ok: boolean; sample: string; rowsCount?: number }> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        accept: "application/json, text/javascript, */*; q=0.01",
        "x-requested-with": "XMLHttpRequest",
        origin: "https://developer.qoo10.jp",
        referer: REFERER,
        cookie,
      },
      body: JSON.stringify({
        id,
        paramList: { ParamList: params },
        ___cache_expire___: String(Date.now()),
      }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, sample: `HTTP ${res.status}` };
    const json = JSON.parse(text) as {
      d?: {
        OutputData?: { return?: number; ErrorMessage?: string };
        ReturnData?: { Rows?: unknown[] };
      };
    };
    const ret = json.d?.OutputData?.return;
    const err = json.d?.OutputData?.ErrorMessage;
    const rows = json.d?.ReturnData?.Rows;
    const rowsCount = Array.isArray(rows) ? rows.length : undefined;
    const sample = JSON.stringify(
      rows?.[0] ?? json.d?.OutputData ?? json,
    ).slice(0, 200);
    return { ok: ret === 0, sample: err ? `err: ${err}` : sample, rowsCount };
  } catch (e) {
    return { ok: false, sample: (e as Error).message };
  }
}

async function main() {
  const cookie = await loadCookie();

  // 후보 RPC들 — 명명 컨벤션(GetQAPI* / GetAPI*)과 흔한 동사(List/All) 조합
  const candidates: Array<{
    id: string;
    params: Array<{ Name: string; Value: string }>;
  }> = [
    // 메서드/클래스 목록 후보
    { id: "APIDevlop.GetQAPIClassList", params: [] },
    {
      id: "APIDevlop.GetQAPIClassList",
      params: [{ Name: "use_yn", Value: "Y" }],
    },
    { id: "APIDevlop.GetQAPIMethodList", params: [] },
    {
      id: "APIDevlop.GetQAPIMethodList",
      params: [{ Name: "c_no", Value: "10003" }],
    },
    {
      id: "APIDevlop.GetQAPIMethodList",
      params: [
        { Name: "c_no", Value: "10003" },
        { Name: "use_yn", Value: "Y" },
      ],
    },
    { id: "APIDevlop.GetQAPIAllMethodList", params: [] },
    {
      id: "APIDevlop.GetQAPIClassMethodList",
      params: [{ Name: "c_no", Value: "10003" }],
    },
    {
      id: "APIDevlop.GetQAPIClassInfo",
      params: [{ Name: "c_no", Value: "10003" }],
    },
    {
      id: "APIDevlop.GetQAPIMethodInfo",
      params: [{ Name: "m_no", Value: "10008" }],
    },
    // 에러코드 / 카테고리 후보
    { id: "APIDevlop.GetQAPIErrorCodeList", params: [] },
    { id: "APIDevlop.GetQAPICategoryList", params: [] },
  ];

  for (const c of candidates) {
    const r = await tryRpc(cookie, c.id, c.params);
    const tag = r.ok ? "OK " : "-- ";
    const rows = r.rowsCount !== undefined ? `rows=${r.rowsCount}` : "";
    console.log(
      `${tag} ${c.id} (${c.params.map((p) => p.Name).join(",") || "-"}) ${rows}`,
    );
    if (r.ok) console.log(`     sample: ${r.sample}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
