import fs from "fs";
import path from "path";
import { mockDataDir } from "@/scripts/mock-handler";
import { fileURLToPath } from "url";

// Compatibilidad ESM para __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorios
const collectionsDir = path.join(__dirname, "..", "postman_collections");
const apiDir = path.join(__dirname, "..", "pages", "api");

// Limpia el directorio de API antes de generar nuevos mocks
function cleanApiDirectory() {
  if (!fs.existsSync(apiDir)) return;

  const files = fs.readdirSync(apiDir);
  files.forEach((file) => {
    if (file.endsWith(".ts")) {
      fs.unlinkSync(path.join(apiDir, file));
    }
  });
}

// Genera el archivo handler para cada endpoint
function generateApiFile(route: string, collectionFileName: string) {
  const fileName = route === "" ? "index" : route;
  const filePath = path.join(apiDir, `${fileName}.ts`);

  // 👌 Aseguramos que el directorio existe
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const fileContent = `
import { handler } from '@/scripts/mock-handler';

export default function apiHandler(req, res) {
  handler(req, res, '${collectionFileName}');
}
  `.trim();

  fs.writeFileSync(filePath, fileContent, "utf8");
  console.log(`✅ Mock endpoint generated: /api/${fileName}`);
}

// Extrae las rutas desde la colección Postman
function extractRoutesFromCollection(collection: any): string[] {
  if (!collection?.item || !Array.isArray(collection.item)) return [];

  const routes: string[] = [];

  collection.item.forEach((item: any) => {
    const pathArray = item.request?.url?.path;
    if (Array.isArray(pathArray)) {
      const route = pathArray.join("/");
      if (route && !routes.includes(route)) {
        routes.push(route);
      }
    }
  });

  return routes;
}

// Función principal
function generateMocksFromCollections() {
  cleanApiDirectory();

  const collectionFiles = fs
    .readdirSync(collectionsDir)
    .filter((file) => file.endsWith(".json"));

  collectionFiles.forEach((file) => {
    const filePath = path.join(collectionsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    let collection;

    try {
      collection = JSON.parse(content);
    } catch (err) {
      console.warn(`⚠️  Invalid JSON in file: ${file}`);
      return;
    }

    // Validar si es colección de Postman
    const schemaUrl = collection?.info?.schema;
    if (
      typeof schemaUrl !== "string" ||
      !schemaUrl.includes("https://schema.getpostman.com/json/collection/")
    ) {
      console.warn(`⚠️  Skipped non-Postman collection: ${file}`);
      return;
    }

    const routes = extractRoutesFromCollection(collection);

    routes.forEach((route) => {
      generateApiFile(route, file);
    });
  });
}

generateMocksFromCollections();
