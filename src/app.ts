import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";


const app = express();


app.use(cors());

app.use(helmet());

app.use(express.json());

app.use(morgan("dev"));



app.get("/", (req, res) => {
  res.json({
    message: "ShopFlowpay API running 🚀"
  });
});



app.use("/api/auth", authRoutes);



export default app;