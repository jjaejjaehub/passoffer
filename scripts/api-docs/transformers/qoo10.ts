#!/usr/bin/env bun
/**
 * Qoo10 raw JSON → .md 변환기
 *
 * 입력: docs/api/qoo10/_raw/{m_no}_info.json + {m_no}_params.json
 * 출력: docs/api/qoo10/{group_dir}/{method_name}.md
 *
 * 사용:
 *   bun scripts/api-docs/transformers/qoo10.ts <m_no> [m_no...]
 *   bun scripts/api-docs/transformers/qoo10.ts --all-seller
 *   bun scripts/api-docs/transformers/qoo10.ts --all-seller --force   # 기존 .md 덮어쓰기
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "../../..");
const RAW_DIR = resolve(PROJECT_ROOT, "docs/api/qoo10/_raw");
const DOCS_DIR = resolve(PROJECT_ROOT, "docs/api/qoo10");

type InfoRow = {
	c_no: number;
	class_name: string;
	class_namespace: string;
	service_nm: string;
	title_admin?: string;
	qc_title_ko?: string;
	qc_title_ja?: string;
	qc_title_en?: string;
	m_no: number;
	method_name: string;
	method_desc?: string;
	method_desc_admin?: string;
	method_desc_ko?: string;
	method_desc_ja?: string;
	method_desc_en?: string;
	method_desc_cn?: string;
	syntax?: string;
	version?: string;
	remarks?: string;
	hashtags?: string;
	example?: string;
	linked_api_nos?: string;
};

type ParamRow = {
	param_no: number;
	m_no: number;
	priority: number;
	key_name: string;
	key_type: string;
	value_length: number | string;
	mandatory_yn: string;
	default_value: string;
	comment: string;
	ko_description?: string;
	en_description?: string;
	ja_description?: string;
	ko_example?: string;
	en_example?: string;
	param_type: "I" | "O";
	use_yn: string;
	indent_level: number;
	value_length_admin?: string;
};

type SellerMethod = {
	m_no: number;
	method_name: string;
	group_nm?: string;
};

// 그룹별 디렉토리 매핑
const GROUP_DIR: Record<string, string> = {
	"상품 관리": "items",
	"배송/취소/문의 관리": "orders",
	공통조회: "common",
	"E-Ticket 관리": "etickets",
	Logistics전용: "logistics",
	"판매자 인증": "auth",
};

function dirForGroup(group: string | undefined): string {
	if (group && GROUP_DIR[group]) return GROUP_DIR[group];
	return "misc";
}

async function loadJson<T = unknown>(path: string): Promise<T> {
	const raw = await readFile(path, "utf-8");
	return JSON.parse(raw) as T;
}

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

function escapeCell(s: string | number | undefined | null): string {
	if (s === null || s === undefined) return "";
	const str = String(s);
	// 파이프와 줄바꿈만 안전 처리 (Qoo10 설명에 \n 흔함)
	return str.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function pickDesc(r: ParamRow): string {
	return r.ko_description || r.comment || r.en_description || r.ja_description || "";
}

function pickExample(r: ParamRow): string {
	return r.ko_example || r.en_example || "";
}

function renderKeyName(keyName: string, indent: number): string {
	const segments = keyName.split("$$").filter(Boolean);
	const leaf = segments[segments.length - 1] ?? keyName;
	const prefix = indent > 0 ? `${"&nbsp;&nbsp;".repeat(indent)}↳ ` : "";
	return `${prefix}\`${leaf}\``;
}

// 부모 경로(예: "ResultObject", "ResultObject$$optionImgResult")가 행 목록에 빠져있으면 합성 행 삽입.
// indent_level 은 데이터 그대로 사용 — 부모는 leaf indent - 1.
function injectParentRows(rows: ParamRow[]): Array<ParamRow | { synthetic: true; key_name: string; indent_level: number }> {
	const seen = new Set<string>();
	for (const r of rows) seen.add(r.key_name);
	const out: Array<ParamRow | { synthetic: true; key_name: string; indent_level: number }> = [];
	const emitted = new Set<string>();
	for (const r of rows) {
		const segments = r.key_name.split("$$").filter(Boolean);
		// 모든 조상 경로를 leaf 앞에 보장
		for (let i = 1; i < segments.length; i++) {
			const ancestor = segments.slice(0, i).join("$$");
			if (!seen.has(ancestor) && !emitted.has(ancestor)) {
				out.push({ synthetic: true, key_name: ancestor, indent_level: i - 1 });
				emitted.add(ancestor);
			}
		}
		out.push(r);
		emitted.add(r.key_name);
	}
	return out;
}

function renderParamTable(rows: ParamRow[], kind: "I" | "O"): string {
	if (rows.length === 0) return "_없음_\n";
	const expanded = injectParentRows(rows);
	if (kind === "I") {
		const lines = [
			"| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |",
			"|---|---|---|---|---|---|",
		];
		for (const r of expanded) {
			if ("synthetic" in r) {
				lines.push(`| ${renderKeyName(r.key_name, r.indent_level)} | _object_ | - | - | _(하위 필드 포함)_ | |`);
				continue;
			}
			lines.push(
				`| ${renderKeyName(r.key_name, r.indent_level)} | ${escapeCell(
					r.key_type,
				)} | ${escapeCell(r.mandatory_yn) || "-"} | ${escapeCell(
					r.value_length_admin || r.value_length,
				)} | ${escapeCell(pickDesc(r))} | ${escapeCell(pickExample(r))} |`,
			);
		}
		return lines.join("\n") + "\n";
	}
	const lines = ["| 필드 | 타입 | 설명 |", "|---|---|---|"];
	for (const r of expanded) {
		if ("synthetic" in r) {
			lines.push(`| ${renderKeyName(r.key_name, r.indent_level)} | _object_ | _(하위 필드 포함)_ |`);
			continue;
		}
		lines.push(
			`| ${renderKeyName(r.key_name, r.indent_level)} | ${escapeCell(
				r.key_type,
			)} | ${escapeCell(pickDesc(r))} |`,
		);
	}
	return lines.join("\n") + "\n";
}

function pickDescription(info: InfoRow): string {
	// HTML <br> 제거
	const raw =
		info.method_desc_ko || info.method_desc_admin || info.method_desc || "";
	return raw.replace(/<br\s*\/?>/gi, "\n").trim();
}

function renderMd(
	info: InfoRow,
	params: ParamRow[],
	group: string | undefined,
): string {
	const inputs = params
		.filter((r) => r.param_type === "I")
		.sort((a, b) => a.priority - b.priority);
	const outputs = params
		.filter((r) => r.param_type === "O")
		.sort((a, b) => a.priority - b.priority);

	const desc = pickDescription(info);
	const today = new Date().toISOString().slice(0, 10);

	const lines: string[] = [];
	lines.push(`# ${info.method_name} — ${info.method_desc || info.title_admin || ""}`);
	lines.push("");
	lines.push("## 메타");
	lines.push("");
	lines.push(`- **메서드명**: \`${info.method_name}\``);
	lines.push(`- **서비스**: \`${info.service_nm}\` (${info.title_admin || ""})`);
	lines.push(`- **클래스**: \`${info.class_name}\` (\`${info.class_namespace}\`)`);
	lines.push(`- **m_no / c_no**: ${info.m_no} / ${info.c_no}`);
	lines.push(`- **그룹**: ${group || "_미분류_"}`);
	if (info.version) lines.push(`- **버전**: ${info.version}`);
	lines.push(`- **원본 크롤링 파일**: \`_raw/${info.m_no}_info.json\`, \`_raw/${info.m_no}_params.json\``);
	lines.push(`- **최종 갱신**: ${today}`);
	lines.push("");

	if (desc) {
		lines.push("## 설명");
		lines.push("");
		lines.push(desc);
		lines.push("");
	}

	if (info.syntax) {
		lines.push("## 시그니처");
		lines.push("");
		lines.push("```csharp");
		lines.push(info.syntax);
		lines.push("```");
		lines.push("");
	}

	lines.push("## 요청 파라미터 (Input)");
	lines.push("");
	lines.push(renderParamTable(inputs, "I"));

	lines.push("## 응답 필드 (Output)");
	lines.push("");
	lines.push(
		"> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.",
	);
	lines.push("");
	lines.push(renderParamTable(outputs, "O"));

	lines.push("## 성공 판정");
	lines.push("");
	lines.push("- HTTP 200 AND `ResultCode === 0`");
	lines.push("- 그 외는 실패 — `ResultMsg` 참조");
	lines.push("");

	lines.push("## 작업 시 주의사항");
	lines.push("");
	lines.push("> 코드 작업하며 발견한 함정/예외를 누적합니다.");
	lines.push("");
	if (info.remarks?.trim()) {
		lines.push(`- (원본 remarks) ${info.remarks.replace(/\r?\n/g, " ").trim()}`);
	}
	if (info.hashtags?.trim()) {
		lines.push(`- 해시태그: ${info.hashtags}`);
	}
	if (info.example?.trim()) {
		lines.push(`- 예시: \`${info.example.trim()}\``);
	}
	lines.push("");

	lines.push("## 관련 코드");
	lines.push("");
	lines.push("- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`");
	if (info.linked_api_nos?.trim()) {
		lines.push(`- 연관 API m_no: ${info.linked_api_nos}`);
	}
	lines.push("");
	return lines.join("\n");
}

async function loadSellerIndex(): Promise<Map<number, SellerMethod>> {
	const path = resolve(RAW_DIR, "_seller_methods.json");
	const arr = (await loadJson<SellerMethod[]>(path)) ?? [];
	const map = new Map<number, SellerMethod>();
	for (const m of arr) map.set(m.m_no, m);
	return map;
}

async function transformOne(
	mNo: string,
	sellerIdx: Map<number, SellerMethod>,
	force: boolean,
): Promise<{ path: string; skipped?: boolean }> {
	const infoPath = resolve(RAW_DIR, `${mNo}_info.json`);
	const paramsPath = resolve(RAW_DIR, `${mNo}_params.json`);

	const infoRaw = await loadJson<{
		d: { ReturnData: { Rows: InfoRow[] } };
	}>(infoPath);
	const paramsRaw = await loadJson<{
		d: { ReturnData: { Rows: ParamRow[] } };
	}>(paramsPath);

	const info = infoRaw.d.ReturnData.Rows[0];
	if (!info) throw new Error(`info row missing for ${mNo}`);
	const params = paramsRaw.d.ReturnData.Rows;

	const sellerMeta = sellerIdx.get(Number(mNo));
	const group = sellerMeta?.group_nm;
	const dir = dirForGroup(group);
	const outPath = resolve(DOCS_DIR, dir, `${info.method_name}.md`);

	if (!force && (await exists(outPath))) {
		return { path: outPath, skipped: true };
	}

	const md = renderMd(info, params, group);
	await mkdir(dirname(outPath), { recursive: true });
	await writeFile(outPath, md, "utf-8");
	return { path: outPath };
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error(
			"usage: bun scripts/api-docs/transformers/qoo10.ts <m_no> [m_no...] | --all-seller [--force]",
		);
		process.exit(1);
	}
	const allSeller = args.includes("--all-seller");
	const force = args.includes("--force");

	const sellerIdx = await loadSellerIndex();
	const mNos = allSeller
		? [...sellerIdx.keys()].map(String).sort()
		: args.filter((a) => !a.startsWith("--"));

	if (mNos.length === 0) {
		console.error("no m_no to transform");
		process.exit(1);
	}

	let ok = 0;
	let skip = 0;
	let fail = 0;
	for (const mNo of mNos) {
		try {
			const r = await transformOne(mNo, sellerIdx, force);
			if (r.skipped) {
				console.log(`[${mNo}] skip (exists) → ${r.path}`);
				skip++;
			} else {
				console.log(`[${mNo}] wrote ${r.path}`);
				ok++;
			}
		} catch (e) {
			console.error(`[${mNo}] FAILED:`, (e as Error).message);
			fail++;
		}
	}
	console.log(`\ndone: ${ok} wrote, ${skip} skipped, ${fail} failed`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
