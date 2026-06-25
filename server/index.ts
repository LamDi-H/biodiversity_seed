import cors from "cors";
import express, { type Request, type Response } from "express";
import {
  addFeedback,
  addInteraction,
  getAnalyticsSummary,
  getConfig,
  getContractFunctions,
  getFeedback,
  getHealth,
  getInteractions,
  getProductReadiness
} from "./services/contractService.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());

app.get("/health", (_request: Request, response: Response) => {
  response.json(getHealth());
});

app.get("/api/config", (_request: Request, response: Response) => {
  response.json({
    data: getConfig()
  });
});

app.get("/api/functions", (_request: Request, response: Response) => {
  response.json({
    data: getContractFunctions()
  });
});

app.get("/api/interactions", (_request: Request, response: Response) => {
  response.json({
    data: getInteractions()
  });
});

app.post("/api/interactions", (request: Request, response: Response) => {
  const record = addInteraction({
    wallet: String(request.body?.wallet ?? ""),
    action: String(request.body?.action ?? ""),
    status: request.body?.status,
    txHash: request.body?.txHash
  });

  response.status(201).json({
    data: record
  });
});

app.get("/api/feedback", (_request: Request, response: Response) => {
  response.json({
    data: getFeedback()
  });
});

app.post("/api/feedback", (request: Request, response: Response) => {
  const record = addFeedback({
    role: String(request.body?.role ?? ""),
    score: Number(request.body?.score ?? 1),
    comment: String(request.body?.comment ?? "")
  });

  response.status(201).json({
    data: record
  });
});

app.get("/api/analytics", (_request: Request, response: Response) => {
  response.json({
    data: getAnalyticsSummary()
  });
});

app.get("/api/product-readiness", (_request: Request, response: Response) => {
  response.json({
    data: getProductReadiness()
  });
});

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    error: "Route not found"
  });
});

app.listen(port, () => {
  console.log(`Biodiversity Seed API running on http://localhost:${port}`);
});
