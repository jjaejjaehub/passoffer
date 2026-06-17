#!/usr/bin/env bun
/**
 * Qoo10 셀러 API 문서 크롤러
 *
 * 사용:
 *   bun scripts/api-docs/crawlers/qoo10.ts <m_no> [m_no...]
 *   bun scripts/api-docs/crawlers/qoo10.ts 10008 10009
 *   bun scripts/api-docs/crawlers/qoo10.ts --all-seller       # _seller_methods.json 전체
 *   bun scripts/api-docs/crawlers/qoo10.ts --all-seller --skip-existing
 *
 * 출력: docs/api/qoo10/_raw/{m_no}_info.json, {m_no}_params.json
 *
 * 쿠키 만료 시: 브라우저 DevTools → Network → 임의 요청 우클릭 →
 *   Copy as cURL → -b 다음 문자열을 .env.local QOO10_DEV_COOKIE 에 갱신
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ENDPOINT =
	"https://developer.qoo10.jp/GMKT.INC.Gsm.Web/swe_DynamicDataService.asmx/ExecuteToDataTable";
const REFERER =
	"https://developer.qoo10.jp/GMKT.INC.Gsm.Web/APIDev/APIDevelopPage.aspx";

const PROJECT_ROOT = resolve(import.meta.dir, "../../..");
const RAW_DIR = resolve(PROJECT_ROOT, "docs/api/qoo10/_raw");
const ENV_PATH = resolve(PROJECT_ROOT, ".env.local");

async function loadCookie(): Promise<string> {
	const raw = await readFile(ENV_PATH, "utf-8");
	// QOO10_DEV_COOKIE='...' 형태에서 값만 추출
	const m = raw.match(/^QOO10_DEV_COOKIE\s*=\s*['"]([\s\S]*?)['"]\s*$/m);
	if (!m) {
		throw new Error("QOO10_DEV_COOKIE not found in .env.local");
	}
	return m[1];
}

type RpcBody = {
	id: string;
	paramList: { ParamList: Array<{ Name: string; Value: string }> };
	___cache_expire___: string;
};

async function callRpc(cookie: string, body: RpcBody): Promise<unknown> {
	const res = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			"content-type": "application/json; charset=UTF-8",
			accept: "application/json, text/javascript, */*; q=0.01",
			"accept-language": "ko,en;q=0.9,en-US;q=0.8,ja;q=0.7",
			"x-requested-with": "XMLHttpRequest",
			origin: "https://developer.qoo10.jp",
			referer: REFERER,
			cookie,
		},
		body: JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
	}
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(
			`Non-JSON response (session may be expired). First 500 chars: ${text.slice(0, 500)}`,
		);
	}
}

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function fetchMethod(
	cookie: string,
	mNo: string,
	opts: { skipExisting?: boolean } = {},
): Promise<void> {
	const infoPath = resolve(RAW_DIR, `${mNo}_info.json`);
	const paramsPath = resolve(RAW_DIR, `${mNo}_params.json`);
	if (
		opts.skipExisting &&
		(await exists(infoPath)) &&
		(await exists(paramsPath))
	) {
		console.log(`[${mNo}] skip (exists)`);
		return;
	}

	const cacheExpire = String(Date.now());

	// 1. 메서드 메타 정보
	const infoBody: RpcBody = {
		id: "APIDevlop.GetQAPIClassMethodInfo",
		paramList: { ParamList: [{ Name: "m_no", Value: mNo }] },
		___cache_expire___: cacheExpire,
	};

	// 2. 파라미터 목록 (param_type="A" 전체, use_yn="Y" 사용중)
	const paramsBody: RpcBody = {
		id: "APIDevlop.GetQAPIMethodParamList",
		paramList: {
			ParamList: [
				{ Name: "m_no", Value: mNo },
				{ Name: "param_type", Value: "A" },
				{ Name: "use_yn", Value: "Y" },
			],
		},
		___cache_expire___: cacheExpire,
	};

	console.log(`[${mNo}] fetching info...`);
	const info = await callRpc(cookie, infoBody);
	console.log(`[${mNo}] fetching params...`);
	const params = await callRpc(cookie, paramsBody);

	await mkdir(dirname(infoPath), { recursive: true });
	await writeFile(infoPath, JSON.stringify(info, null, 2), "utf-8");
	await writeFile(paramsPath, JSON.stringify(params, null, 2), "utf-8");

	const infoSize = JSON.stringify(info).length;
	const paramsSize = JSON.stringify(params).length;
	console.log(`[${mNo}] saved: info=${infoSize}B, params=${paramsSize}B`);
}

async function loadSellerMNos(): Promise<string[]> {
	const path = resolve(RAW_DIR, "_seller_methods.json");
	const raw = await readFile(path, "utf-8");
	const arr = JSON.parse(raw) as Array<{ m_no: number }>;
	return arr.map((r) => String(r.m_no));
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error(
			"usage: bun scripts/api-docs/crawlers/qoo10.ts <m_no> [m_no...] | --all-seller [--skip-existing]",
		);
		process.exit(1);
	}

	const allSeller = args.includes("--all-seller");
	const skipExisting = args.includes("--skip-existing");
	const mNos = allSeller
		? await loadSellerMNos()
		: args.filter((a) => !a.startsWith("--"));

	if (mNos.length === 0) {
		console.error("no m_no to fetch");
		process.exit(1);
	}

	const cookie = await loadCookie();
	console.log(
		`fetching ${mNos.length} method(s)${skipExisting ? " (skip-existing)" : ""}`,
	);
	let ok = 0;
	let fail = 0;
	for (const mNo of mNos) {
		try {
			await fetchMethod(cookie, mNo, { skipExisting });
			ok++;
		} catch (e) {
			console.error(`[${mNo}] FAILED:`, (e as Error).message);
			fail++;
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	console.log(`\ndone: ${ok} ok, ${fail} failed`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
