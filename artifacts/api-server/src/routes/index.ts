import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import walletRouter from "./wallet";
import productsRouter from "./products";
import referralsRouter from "./referrals";
import tournamentsRouter from "./tournaments";
import bonusesRouter from "./bonuses";
import tasksRouter from "./tasks";
import mpesaRouter from "./mpesa";
import verifyRouter from "./verify";
import settingsRouter from "./settings";
import smtpRouter from "./smtp";
import investmentsRouter from "./investments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/wallet", walletRouter);
router.use("/products", productsRouter);
router.use("/referrals", referralsRouter);
router.use("/tournaments", tournamentsRouter);
router.use("/bonuses", bonusesRouter);
router.use("/tasks", tasksRouter);
router.use("/mpesa", mpesaRouter);
router.use("/verify", verifyRouter);
router.use("/settings", settingsRouter);
router.use("/smtp", smtpRouter);
router.use("/investments", investmentsRouter);

export default router;
