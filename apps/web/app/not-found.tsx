import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function NotFound(): Promise<React.JSX.Element> {
  const t = await getTranslations("pages.notFound");
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>{t("title")}</h1>
    </div>
  );
}
