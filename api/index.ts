import express from "express";
import cors from "cors";
import { searchRouter } from "../server/src/routes/search.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", searchRouter);

export default app;
