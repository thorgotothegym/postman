import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NextApiRequest, NextApiResponse } from "next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mockDataDir = path.join(__dirname, "..", "mock_data");

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";

export const isPostmanCollection = (collection: any): boolean => {
  const schemaUrl = collection?.info?.schema;
  return (
    typeof schemaUrl === "string" &&
    schemaUrl.startsWith("https://schema.getpostman.com/json/collection/")
  );
};

export const generateMocksFromCollections = (collectionsDir: string) => {
  const apiDir = path.join(__dirname, "pages", "api");

  if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });
  if (!fs.existsSync(mockDataDir))
    fs.mkdirSync(mockDataDir, { recursive: true });

  fs.readdirSync(apiDir).forEach((file) =>
    fs.unlinkSync(path.join(apiDir, file))
  );

  fs.readdirSync(collectionsDir).forEach((file) => {
    if (!file.endsWith(".json")) return;

    const collectionPath = path.join(collectionsDir, file);
    const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

    if (!isPostmanCollection(collection)) {
      console.warn(
        `⚠️  Archivo ignorado: ${file} no es una colección válida de Postman.`
      );
      return;
    }

    const items = collection.item || [];

    items.forEach((item: any) => {
      const route = Array.isArray(item.request?.url?.path)
        ? item.request.url.path.join("/")
        : "";
      const fileName = route.replace(/\//g, "-") || "index";
      const mockFileName = file.replace(".postman_collection", "");

      const endpointFile = path.join(apiDir, `${fileName}.ts`);
      const handlerCode = `
import { handler } from '../../mock-handler';
export default function apiHandler(req, res) {
  handler(req, res, '${mockFileName}');
}
      `.trim();

      fs.writeFileSync(endpointFile, handlerCode, "utf8");
      fs.copyFileSync(
        collectionPath,
        path.join(mockDataDir, `${mockFileName}.json`)
      );

      console.log(`✅ Mock endpoint generated: /api/${fileName}`);
    });
  });
};

export const handler = (
  req: NextApiRequest,
  res: NextApiResponse,
  mockFileName: string
) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const mockFile = path.join(mockDataDir, mockFileName); // 👈 Quitamos el ".json" duplicado
  if (!fs.existsSync(mockFile)) {
    return res.status(404).json({ error: "Mock not found" });
  }

  const data = JSON.parse(fs.readFileSync(mockFile, "utf8"));

  // 🔍 Aquí resolvemos dinámicamente la ruta y método
  const { url, method } = req;
  const route = url?.replace(/^\/api\//, "").split("?")[0]; // eliminamos /api/ y query params

  const mockResponse = data?.[route]?.[method];

  if (!mockResponse) {
    return res.status(404).json({ error: "Mock not found" });
  }

  return res.status(200).json(mockResponse);
};
