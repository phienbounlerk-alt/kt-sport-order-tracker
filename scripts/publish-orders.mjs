import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbPath = path.join(root, "data", "db.json");
const ordersDir = path.join(root, "published", "orders");
const mockupsDir = path.join(root, "published", "mockups");

fs.mkdirSync(ordersDir, { recursive: true });
fs.mkdirSync(mockupsDir, { recursive: true });

function extensionForMime(mime) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function orderImages(order) {
  const images = Array.isArray(order.mockupImages) ? [...order.mockupImages] : [];
  if (order.mockupImage) images.unshift(order.mockupImage);
  return [...new Set(images.map((image) => String(image || "").trim()).filter(Boolean))];
}

function publishImage(order, image, index, total) {
  if (!image.startsWith("data:image/")) return image;

  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error(`Invalid mockup image for ${order.token}`);

  const ext = extensionForMime(match[1]);
  const suffix = total > 1 ? `-${index + 1}` : "";
  const relativeImagePath = `published/mockups/${order.token}${suffix}.${ext}`;
  const imagePath = path.join(root, relativeImagePath);
  fs.writeFileSync(imagePath, Buffer.from(match[2], "base64"));
  return relativeImagePath;
}

function publishOrder(order) {
  const publicOrder = { ...order };
  const images = orderImages(order).map((image, index, allImages) => publishImage(order, image, index, allImages.length));
  publicOrder.mockupImages = images;
  publicOrder.mockupImage = images[0] || "";

  fs.writeFileSync(
    path.join(ordersDir, `${order.token}.json`),
    `${JSON.stringify(publicOrder, null, 2)}\n`,
  );
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
for (const order of db.orders || []) {
  if (!order.token) continue;
  publishOrder(order);
}

console.log(`Published ${(db.orders || []).length} orders`);
