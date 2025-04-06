import { handler } from "@/scripts/mock-handler";

export default function apiHandler(req, res) {
  handler(req, res, "Be-Compute MH.postman_collection.json");
}
