import { createSigner } from "fast-jwt";

const userId = process.argv[2] ?? "178a6913-3cbf-4290-b47b-ab866a92fe14";
const channelId = process.argv[3] ?? "1c467612-cd58-4f0c-9a5b-e541397432ce";
const inventoryItemId =
  process.argv[4] ?? "gid://shopify/InventoryItem/54215439155563";
const newQuantity = Number(process.argv[5] ?? "321");
const currentQuantity = Number(process.argv[6] ?? "0");

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET not set");

const signer = createSigner({
  key: secret,
  expiresIn: 7 * 24 * 60 * 60 * 1000,
});
const token = signer({ userId, email: "tech1@miraise.com", name: "tester" });

const url = `http://localhost:4000/api/inventory/${channelId}/adjust`;
console.log("[POST]", url, { inventoryItemId, newQuantity, currentQuantity });

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ inventoryItemId, newQuantity, currentQuantity }),
});
const body = await res.text();
console.log("[status]", res.status);
console.log("[body]", body);
