import { Router, type IRouter } from "express";
import { requireAdmin } from "../../middlewares/adminAuth";
import adminAuthRouter from "./auth";
import adminStatsRouter from "./stats";
import adminUsersRouter from "./users";
import adminVerificationsRouter from "./verifications";
import adminTransactionsRouter from "./transactions";
import adminTasksRouter from "./tasks";
import adminReferralsRouter from "./referrals";
import adminAuditRouter from "./audit";
import adminAdminsRouter from "./admins";
import adminWithdrawalsRouter from "./withdrawals";
import adminSettingsRouter from "./settings";
import adminControlRouter from "./control";
import adminInvestmentsRouter from "./investments";

const router: IRouter = Router();

router.use("/auth", adminAuthRouter);
router.use("/stats", requireAdmin, adminStatsRouter);
router.use("/users", requireAdmin, adminUsersRouter);
router.use("/verifications", requireAdmin, adminVerificationsRouter);
router.use("/transactions", requireAdmin, adminTransactionsRouter);
router.use("/tasks", requireAdmin, adminTasksRouter);
router.use("/referrals", requireAdmin, adminReferralsRouter);
router.use("/audit-log", requireAdmin, adminAuditRouter);
router.use("/admins", requireAdmin, adminAdminsRouter);
router.use("/withdrawals", requireAdmin, adminWithdrawalsRouter);
router.use("/settings", requireAdmin, adminSettingsRouter);
router.use("/control", requireAdmin, adminControlRouter);
router.use("/investments", requireAdmin, adminInvestmentsRouter);

export default router;
