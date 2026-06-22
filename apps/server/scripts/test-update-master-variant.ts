import { createSigner } from "fast-jwt";

const userId = process.argv[2] ?? "178a6913-3cbf-4290-b47b-ab866a92fe14";
const masterProductId =
  process.argv[3] ?? "73cdad71-c123-47f2-b20e-fadd95d2580c";
const variantId = process.argv[4] ?? "02662d40-f4e8-4221-91de-050e60e31b8d";
const newStock = Number(process.argv[5] ?? "555");

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET not set");

const signer = createSigner({
  key: secret,
  expiresIn: 7 * 24 * 60 * 60 * 1000,
});
const token = signer({ userId, email: "tech1@miraise.com", name: "tester" });

const url = `http://localhost:4000/api/master-products/${masterProductId}/variants/${variantId}`;
console.log("[PUT]", url, { stock: newStock });

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ stock: newStock }),
});
const body = await res.text();
console.log("[status]", res.status);
console.log("[body]", body);
