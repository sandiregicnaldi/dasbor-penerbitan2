
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db";
import router from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", router);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
