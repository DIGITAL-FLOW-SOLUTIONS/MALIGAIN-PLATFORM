import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";

const router: IRouter = Router();

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

router.get("/", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0]!;

    const { data: tasks, error } = await supabase.from("tasks").select("*").order("id");
    if (error) throw error;

    const taskList = (tasks ?? []) as Array<Record<string, unknown>>;
    const taskIds = taskList.map(t => t["id"] as number);

    let completionCounts: Record<number, number> = {};
    let totalCounts: Record<number, number> = {};

    if (taskIds.length > 0) {
      const { data: todayCompletions } = await supabase
        .from("task_completions")
        .select("task_id")
        .in("task_id", taskIds)
        .gte("completed_at", `${today}T00:00:00Z`);

      const { data: allCompletions } = await supabase
        .from("task_completions")
        .select("task_id")
        .in("task_id", taskIds);

      for (const c of (todayCompletions ?? []) as Array<Record<string, unknown>>) {
        const tid = c["task_id"] as number;
        completionCounts[tid] = (completionCounts[tid] ?? 0) + 1;
      }
      for (const c of (allCompletions ?? []) as Array<Record<string, unknown>>) {
        const tid = c["task_id"] as number;
        totalCounts[tid] = (totalCounts[tid] ?? 0) + 1;
      }
    }

    res.json({
      tasks: taskList.map(t => ({
        id: t["id"],
        name: t["name"],
        type: t["type"],
        reward: num(t["reward"]),
        availableCount: t["available_count"] ?? 0,
        description: t["description"] ?? "",
        difficulty: t["difficulty"] ?? null,
        completionsToday: completionCounts[t["id"] as number] ?? 0,
        totalCompletions: totalCounts[t["id"] as number] ?? 0,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin list tasks error");
    res.status(500).json({ error: "ServerError", message: "Failed to list tasks" });
  }
});

router.put("/:taskId", async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(String(req.params["taskId"]));
    if (isNaN(taskId)) { res.status(400).json({ error: "ValidationError", message: "Invalid task ID" }); return; }

    const { name, reward, availableCount, description, difficulty } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates["name"] = name;
    if (reward !== undefined) updates["reward"] = Number(reward);
    if (availableCount !== undefined) updates["available_count"] = Number(availableCount);
    if (description !== undefined) updates["description"] = description;
    if (difficulty !== undefined) updates["difficulty"] = difficulty;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "ValidationError", message: "Nothing to update" }); return;
    }

    await supabase.from("tasks").update(updates).eq("id", taskId);
    await logAdminAction(req.session.adminUsername!, "update_task", "task", taskId, updates);
    res.json({ message: "Task updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin update task error");
    res.status(500).json({ error: "ServerError", message: "Failed to update task" });
  }
});

export default router;
