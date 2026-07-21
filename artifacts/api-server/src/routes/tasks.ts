import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();
router.use(requireAuth);

function num(val: unknown): number {
  return parseFloat(String(val ?? "0")) || 0;
}

// Hardcoded task rewards per country (in local currency, rounded to nearest formal amount)
// task type → country → reward amount
const TASK_REWARDS: Record<string, Record<string, number>> = {
  survey: { KE: 50, CM: 850, GH: 20, UG: 3350, ZM: 35, TZ: 2500 },
  blogging: { KE: 30, CM: 500, GH: 15, UG: 2000, ZM: 20, TZ: 1500 },
  video: { KE: 20, CM: 350, GH: 10, UG: 1350, ZM: 15, TZ: 1000 },
  trivia: { KE: 40, CM: 650, GH: 15, UG: 2650, ZM: 30, TZ: 2000 },
  chat: { KE: 500, CM: 8350, GH: 180, UG: 33350, ZM: 350, TZ: 25000 },
};

function getTaskReward(taskType: string, country: string | null): number {
  const countryKey = (country ?? "KE").toUpperCase();
  return (
    TASK_REWARDS[taskType]?.[countryKey] ?? TASK_REWARDS[taskType]?.["KE"] ?? 0
  );
}

export const TASKS = [
  {
    id: 1,
    name: "SURVEYS",
    type: "survey" as const,
    rewardKES: 50,
    availableCount: 18,
    description: "Complete online surveys and earn rewards",
    difficulty: "Easy",
  },
  {
    id: 2,
    name: "BLOGGING",
    type: "blogging" as const,
    rewardKES: 30,
    availableCount: 28,
    description: "Write blog content and get paid per post",
    difficulty: "Easy",
  },
  {
    id: 3,
    name: "Watch and earn",
    type: "video" as const,
    rewardKES: 20,
    availableCount: 5,
    description: "Watch videos and earn per completion",
    difficulty: "Easy",
  },
  {
    id: 4,
    name: "trivia",
    type: "trivia" as const,
    rewardKES: 40,
    availableCount: 18,
    description: "Answer trivia questions to earn rewards",
    difficulty: "Easy",
  },
  {
    id: 5,
    name: "Chat with lonely people",
    type: "chat" as const,
    rewardKES: 500,
    availableCount: 500,
    description:
      "Complete the task on the external platform and earn per session",
    difficulty: "Easy",
  },
];

// Trivia questions with correct answers (stored server-side for validation)
const TRIVIA_ANSWERS: Record<number, string> = {
  0: "A", // What is the largest continent by area? → Asia
  1: "B", // Which planet is known as the Red Planet? → Mars
  2: "C", // How many continents are there on Earth? → 7
};

router.get("/", async (req: Request, res: Response) => {
  const userId = req.session.userId!;

  const [completionsResult, userResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("description")
      .eq("user_id", userId)
      .eq("type", "bonus")
      .gte(
        "created_at",
        (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })(),
      )
      .ilike("description", "Task:%"),
    supabase.from("users").select("country").eq("id", userId).limit(1),
  ]);

  const country =
    (((userResult.data ?? [])[0] as Record<string, unknown> | undefined)?.[
      "country"
    ] as string | null) ?? null;

  const doneTaskIds = new Set(
    (completionsResult.data ?? [])
      .map((t: Record<string, unknown>) => {
        const match = String(t["description"] ?? "").match(/^Task:(\d+):/);
        return match ? parseInt(match[1]!) : null;
      })
      .filter(Boolean),
  );

  const tasks = TASKS.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    availableCount: t.availableCount,
    description: t.description,
    difficulty: t.difficulty,
    reward: getTaskReward(t.type, country),
    doneToday: doneTaskIds.has(t.id),
  }));

  res.json({
    tasks,
    totalAvailable: tasks.filter((t) => !t.doneToday).length,
    doneTodayCount: doneTaskIds.size,
  });
});

router.post("/:id/start", async (req: Request, res: Response) => {
  const taskId = parseInt(String(req.params["id"]));
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: "NotFound", message: "Task not found" });
    return;
  }
  res.json({
    message: `${task.name} task started successfully!`,
    success: true,
  });
});

router.post("/:id/complete", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const taskId = parseInt(String(req.params["id"]));
    const task = TASKS.find((t) => t.id === taskId);

    if (!task) {
      res.status(404).json({ error: "NotFound", message: "Task not found" });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [existingResult, userResult] = await Promise.all([
      supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "bonus")
        .gte("created_at", todayStart.toISOString())
        .ilike("description", `Task:${taskId}:%`)
        .limit(1),
      supabase.from("users").select("country, status").eq("id", userId).limit(1),
    ]);

    // Guard: only active (paid) users may earn task rewards
    const userRow = (userResult.data ?? [])[0] as Record<string, unknown> | undefined;
    const userStatus = userRow?.["status"] as string | undefined;
    if (userStatus !== "active") {
      res.status(403).json({
        error: "AccountInactive",
        message: "Your account must be active to complete tasks and earn rewards. Please activate your account first.",
      });
      return;
    }

    if (existingResult.data && existingResult.data.length > 0) {
      res.status(400).json({
        error: "AlreadyCompleted",
        message:
          "You have already completed this task today. Come back tomorrow!",
      });
      return;
    }

    const country = (userRow?.["country"] as string | null) ?? null;
    const reward = getTaskReward(task.type, country);

    // Trivia answer validation
    if (task.type === "trivia") {
      const { answers } = req.body as { answers?: string[] };
      if (!answers || !Array.isArray(answers)) {
        res.status(400).json({
          error: "ValidationError",
          message: "Answers are required for trivia tasks",
        });
        return;
      }
      const allCorrect = Object.entries(TRIVIA_ANSWERS).every(
        ([idx, correct]) => answers[parseInt(idx)]?.toUpperCase() === correct,
      );
      if (!allCorrect) {
        res.status(400).json({
          error: "WrongAnswer",
          message: "Some answers are incorrect. Try again tomorrow!",
        });
        return;
      }
    }

    // Survey validation — all questions must be answered
    if (task.type === "survey") {
      const { answers } = req.body as { answers?: Record<string, string> };
      if (!answers || Object.keys(answers).length < 3) {
        res.status(400).json({
          error: "ValidationError",
          message: "Please answer all survey questions",
        });
        return;
      }
    }

    // Blog validation — min word count
    if (task.type === "blogging") {
      const { title, content } = req.body as {
        title?: string;
        content?: string;
      };
      if (!title || title.trim().length < 5) {
        res.status(400).json({
          error: "ValidationError",
          message: "Please provide a blog title",
        });
        return;
      }
      const wordCount = (content ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      if (wordCount < 200) {
        res.status(400).json({
          error: "ValidationError",
          message: "Blog post must be at least 200 words",
        });
        return;
      }
    }

    // Video/watch task — user must have spent at least 60 seconds on the task
    if (task.type === "video") {
      const { watchedSeconds } = req.body as { watchedSeconds?: number };
      if (!watchedSeconds || Number(watchedSeconds) < 60) {
        res.status(400).json({
          error: "ValidationError",
          message: "You must watch for at least 60 seconds before claiming your reward.",
        });
        return;
      }
    }

    // Chat task — user must have spent at least 5 minutes (300 seconds) on the task
    if (task.type === "chat") {
      const { sessionDuration } = req.body as { sessionDuration?: number };
      if (!sessionDuration || Number(sessionDuration) < 300) {
        res.status(400).json({
          error: "ValidationError",
          message: "You must complete a full chat session (at least 5 minutes) before claiming your reward.",
        });
        return;
      }
    }

    // --- Anti-race-condition: insert the transaction record FIRST (pending),
    // then verify no duplicate exists, then credit wallet and mark completed.
    // This drastically shrinks the window for concurrent double-submissions.
    const txnDescription = `Task:${taskId}: ${task.name} reward`;

    const { data: newTxn, error: txnInsertError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "bonus",
        amount: reward,
        status: "pending",
        description: txnDescription,
      })
      .select("id")
      .single();

    if (txnInsertError || !newTxn) {
      res.status(500).json({ error: "ServerError", message: "Failed to record task completion. Please try again." });
      return;
    }

    const newTxnId = (newTxn as Record<string, unknown>)["id"];

    // Check for duplicate completions today (race-condition guard)
    const { data: duplicates } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "bonus")
      .gte("created_at", todayStart.toISOString())
      .ilike("description", `Task:${taskId}:%`)
      .limit(2);

    if (duplicates && duplicates.length > 1) {
      // Another concurrent request already inserted — roll back ours
      await supabase.from("transactions").delete().eq("id", newTxnId);
      res.status(400).json({
        error: "AlreadyCompleted",
        message: "You have already completed this task today. Come back tomorrow!",
      });
      return;
    }

    // Credit the user's wallet with the locally converted reward
    let { data: wallets } = await supabase
      .from("wallet")
      .select("*")
      .eq("user_id", userId)
      .limit(1);

    if (!wallets || wallets.length === 0) {
      const { data: newWallet } = await supabase
        .from("wallet")
        .insert({
          user_id: userId,
          main_wallet: 0,
          total_earned: 0,
          today_earnings: 0,
          affiliate_balance: 0,
          commissions: 0,
          team_earnings: 0,
          total_withdrawn: 0,
        })
        .select()
        .single();
      wallets = newWallet ? [newWallet] : [];
    }

    const wallet = (wallets?.[0] ?? {}) as Record<string, unknown>;

    await supabase
      .from("wallet")
      .update({
        main_wallet: num(wallet["main_wallet"]) + reward,
        total_earned: num(wallet["total_earned"]) + reward,
        today_earnings: num(wallet["today_earnings"]) + reward,
      })
      .eq("user_id", userId);

    // Mark the pre-inserted transaction as completed
    await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", newTxnId);

    res.json({
      success: true,
      message: `Task completed! You earned ${reward} from ${task.name}.`,
      reward,
    });
  } catch (err) {
    req.log.error({ err }, "Complete task error");
    res
      .status(500)
      .json({ error: "ServerError", message: "Failed to complete task" });
  }
});

export default router;
