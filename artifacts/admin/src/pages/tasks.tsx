import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, TaskItem } from "@/lib/api";
import { Pencil, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function DifficultyBadge({ d }: { d?: string }) {
  if (!d) return null;
  const colors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[d.toLowerCase()] ?? "bg-muted text-muted-foreground"}`}>
      {d}
    </span>
  );
}

const editInputCls = "px-2 py-1 border border-primary/30 rounded text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

function EditTaskRow({ task, onDone }: { task: TaskItem; onDone: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reward, setReward] = useState(String(task.reward));
  const [availableCount, setAvailableCount] = useState(String(task.availableCount));
  const [description, setDescription] = useState(task.description);
  const [difficulty, setDifficulty] = useState(task.difficulty ?? "");

  const mut = useMutation({
    mutationFn: () => api.updateTask(task.id, { reward: Number(reward), availableCount: Number(availableCount), description, difficulty: difficulty || undefined }),
    onSuccess: () => { toast({ title: "Task updated" }); qc.invalidateQueries({ queryKey: ["admin-tasks"] }); onDone(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <tr className="bg-primary/5">
      <td className="px-4 py-2 font-medium text-foreground text-sm">{task.name}</td>
      <td className="px-4 py-2">
        <input type="number" value={reward} onChange={e => setReward(e.target.value)} className={`w-24 ${editInputCls}`} />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={availableCount} onChange={e => setAvailableCount(e.target.value)} className={`w-20 ${editInputCls}`} />
      </td>
      <td className="px-4 py-2">
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={editInputCls}>
          <option value="">—</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </td>
      <td className="px-4 py-2" colSpan={2}>
        <input value={description} onChange={e => setDescription(e.target.value)} className={`w-full ${editInputCls}`} />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="p-1.5 rounded bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDone} className="p-1.5 rounded border border-border hover:bg-muted/40 text-muted-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Tasks() {
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: api.listTasks,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
        <p className="text-muted-foreground text-sm mt-1">View and edit platform tasks</p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Reward (KES)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Available</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Difficulty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Today / Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.tasks ?? []).map((t: TaskItem) =>
                  editingId === t.id ? (
                    <EditTaskRow key={t.id} task={t} onDone={() => setEditingId(null)} />
                  ) : (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{t.description}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">{t.reward.toFixed(2)}</td>
                      <td className="px-4 py-3 text-foreground/80">{t.availableCount}</td>
                      <td className="px-4 py-3"><DifficultyBadge d={t.difficulty} /></td>
                      <td className="px-4 py-3 text-foreground/70">{t.completionsToday} / {t.totalCompletions}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{t.type}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditingId(t.id)}
                          className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
                {data?.tasks.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
