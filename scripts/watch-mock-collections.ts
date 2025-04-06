import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import {
  generateMocksFromCollections,
  isPostmanCollection,
} from "./mock-handler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const collectionsDir = path.join(__dirname, "..", "postman_collections");

console.log("👀 Watching for changes in postman_collections...");

const processFile = (filePath: string) => {
  if (!filePath.endsWith(".json")) return;

  const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!isPostmanCollection(content)) {
    console.warn(
      `⚠️  Archivo ignorado: ${filePath} no es una colección válida de Postman.`
    );
    return;
  }

  generateMocksFromCollections(collectionsDir);
};

generateMocksFromCollections(collectionsDir);

chokidar.watch(collectionsDir).on("all", (event, filePath) => {
  console.log(`🔄 Change detected: ${event} ${filePath}`);
  processFile(filePath);
});
