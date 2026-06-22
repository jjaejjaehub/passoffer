import { redirect } from "next/navigation";
import { ROUTES } from "@/shared/config";

export default function Page(): never {
  redirect(ROUTES.payments);
}
