import { handler } from '../../mock-handler';
export default function apiHandler(req, res) {
  handler(req, res, 'Be-Compute MH.json');
}