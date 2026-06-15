#!/usr/bin/env bun
/**
 * Qoo10 전체 메서드 목록을 받아 docs/api/qoo10/_raw/_method_list.json 에 저장.
 * 셀러 API (qm_use_yn === "Y" 등) 필터링된 요약도 _raw/_seller_methods.json 으로.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ENDPOINT =
	"https://developer.qoo10.jp/GMKT.INC.Gsm.Web/swe_DynamicDataService.asmx/ExecuteToDataTable";
const REFERER =
	"https://developer.qoo10.jp/GMKT.INC.Gsm.Web/APIDev/APIDevelopPage.aspx";
const PROJECT_ROOT = resolve(import.meta.dir, "../../..");
const RAW_DIR = resolve(PROJECT_ROOT, "docs/api/qoo10/_raw");
const ENV_PATH = resolve(PROJECT_ROOT, ".env.local");

async function loadCookie(): Promise<string> {
	const raw = await readFile(ENV_PATH, "utf-8");
	const m = raw.match(/^QOO10_DEV_COOKIE\s*=\s*['"]([\s\S]*?)['"]\s*$/m);
	if (!m) throw new Error("QOO10_DEV_COOKIE not found");
	return m[1];
}

type MethodRow = {
	m_no: number;
	c_no: number;
	app_no: number;
	class_name: string;
	class_namespace: string;
	service_nm: string;
	method_name: string;
	method_desc?: string;
	title_admin?: string;
	title_ko?: string;
	title_en?: string;
	title_ja?: string;
	group_no?: number | string;
	group_nm?: string;
	group_nm_ko?: string;
	use_yn?: string;
	display_yn?: string;
	qc_display_yn?: string;
	inner_service_yn?: string;
	version?: string;
	kind?: string;
	display_menu_nm?: string;
	display_menu_no?: number;
};

async function main() {
	const cookie = await loadCookie();
	console.log("fetching full method list...");
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
			id: "APIDevlop.GetQAPIMethodList",
			paramList: { ParamList: [] },
			___cache_expire___: String(Date.now()),
		}),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
	}
	const json = JSON.parse(text) as {
		d: { OutputData: { return: number }; ReturnData: { Rows: MethodRow[] } };
	};

	if (json.d.OutputData.return !== 0) {
		throw new Error(`return code ${json.d.OutputData.return}`);
	}

	const rows = json.d.ReturnData.Rows;
	await mkdir(RAW_DIR, { recursive: true });
	await writeFile(
		resolve(RAW_DIR, "_method_list.json"),
		JSON.stringify(json, null, 2),
		"utf-8",
	);
	console.log(`saved full list: ${rows.length} rows`);

	// 셀러 API: app_no=125 (셀러 개발자 페이지), 사용중, 노출중, 내부 서비스 아님
	const isSellerApi = (r: MethodRow) =>
		r.app_no === 125 &&
		r.use_yn === "Y" &&
		r.display_yn === "Y" &&
		r.inner_service_yn !== "Y";

	const seller = rows
		.filter(isSellerApi)
		.map((r) => ({
			m_no: r.m_no,
			c_no: r.c_no,
			class_name: r.class_name,
			service_nm: r.service_nm,
			method_name: r.method_name,
			method_desc: r.method_desc,
			title_ko: r.title_ko,
			group_nm: r.group_nm_ko ?? r.group_nm,
			display_menu_nm: r.display_menu_nm,
			version: r.version,
		}))
		.sort((a, b) => a.m_no - b.m_no);

	await writeFile(
		resolve(RAW_DIR, "_seller_methods.json"),
		JSON.stringify(seller, null, 2),
		"utf-8",
	);
	console.log(`\nsaved seller methods: ${seller.length}`);

	// 그룹별 요약
	const byGroup = new Map<string, MethodRow[]>();
	for (const r of rows) {
		if (!isSellerApi(r)) continue;
		const key = `${r.group_no ?? "?"}|${r.group_nm_ko ?? r.group_nm ?? "?"}`;
		const arr = byGroup.get(key) ?? [];
		arr.push(r);
		byGroup.set(key, arr);
	}
	console.log(`\nseller groups (${byGroup.size}):`);
	for (const [key, methods] of [...byGroup.entries()].sort()) {
		console.log(`  ${key} (${methods.length} methods)`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
