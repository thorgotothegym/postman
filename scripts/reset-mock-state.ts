import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postmanCollection from "postman-collection";
const { Collection } = postmanCollection;

// Compatibilidad ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDataDir = path.join(__dirname, "..", "mock_data");
const collectionDir = path.join(__dirname, "..", "postman_collections");

// Asegura que la carpeta mock_data existe
function ensureMockDataDir() {
  if (!fs.existsSync(mockDataDir)) {
    fs.mkdirSync(mockDataDir, { recursive: true });
  }
}

// Limpia mock_data antes de regenerar
function cleanMockDataDir() {
  if (!fs.existsSync(mockDataDir)) return;

  const files = fs.readdirSync(mockDataDir);

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      fs.unlinkSync(path.join(mockDataDir, file));
    }
  });
}

function resetMocks() {
  ensureMockDataDir();
  cleanMockDataDir();

  const collectionFiles = fs
    .readdirSync(collectionDir)
    .filter((file) => file.endsWith(".json"));

  collectionFiles.forEach((collectionFile) => {
    const collectionPath = path.join(collectionDir, collectionFile);
    const content = fs.readFileSync(collectionPath, "utf8");

    let collection;
    try {
      collection = new Collection(JSON.parse(content));
    } catch (error) {
      console.warn(`⚠️  Invalid Postman collection: ${collectionFile}`);
      return;
    }

    const initialState: Record<string, any> = {};

    collection.items.each((item) => {
      const request = item.request;
      const responses = item.responses.all();

      if (!request || responses.length === 0) {
        console.warn(
          `⚠️  Skipping item with missing request or responses: ${item.name()}`
        );
        return;
      }

      // Ruta limpia
      const urlPath = request.url.path;

      const route = Array.isArray(urlPath)
        ? urlPath.join("/")
        : (request.url.getPath() || "").replace(/^\//, "");

      const method = request.method.toUpperCase();

      // Usamos la primera respuesta por defecto
      const responseBody = responses[0].body;
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(responseBody);
      } catch {
        parsedResponse = responseBody;
      }

      if (!initialState[route]) {
        initialState[route] = {};
      }

      initialState[route][method] = parsedResponse;
    });

    const mockFilePath = path.join(mockDataDir, collectionFile);

    fs.writeFileSync(
      mockFilePath,
      JSON.stringify(initialState, null, 2),
      "utf8"
    );
    console.log(`✅ Mock state reset: ${collectionFile}`);
  });
}

resetMocks();
