// Vercel serverless entry point for the LP Copilot API.
// Express receives the original /api/... path, so the existing API contract stays intact.
import app from "../backend/server.js";

export default app;
