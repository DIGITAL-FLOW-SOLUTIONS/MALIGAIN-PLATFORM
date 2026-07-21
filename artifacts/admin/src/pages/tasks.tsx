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
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[d.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}>
      {d}
    </span>
  );
}

function EditTaskRow({ task, onDone }: { task: TaskItem; onDone: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reward, setReward] = useState(String(task.reward));
  const [availableCount, setAvailableCount] = useState(String(task.availableCount));
  const [description, setDescription] = useState(task.description);
  const [difficulty, setDifficulty] = useState(task.difficulty ?? "");

  const mut = useMutation({
    mutationFn: () => api.updateTask(task.id, {
      reward: Number(reward),
      availableCount: Number(availableCount),
      description,
      difficulty: difficulty || undefined,
    }),
    onSuccess: () => { toast({ title: "Task updated" }); qc.invalidateQueries({ queryKey: ["admin-tasks"] }); onDone(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <tr className="bg-indigo-50">
      <td className="px-4 py-2 font-medium text-gray-900 text-sm">{task.name}</td>
      <td className="px-4 py-2">
        <input type="number" value={reward} onChange={e => setReward(e.target.value)}
          className="w-24 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={availableCount} onChange={e => setAvailableCount(e.target.value)}
          className="w-20 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </td>
      <td className="px-4 py-2">
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
          className="px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">—</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </td>
      <td className="px-4 py-2" colSpan={2}>
        <input value={description} onChange={e => setDescription(e.target.value)}
          className="w-full px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="p-1.5 rounded bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDone} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
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
        <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
        <p className="text-gray-500 text-sm mt-1">View and edit platform tasks</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reward (KES)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Available</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Difficulty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Today / Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.tasks ?? []).map((t: TaskItem) =>
                  editingId === t.id ? (
                    <EditTaskRow key={t.id} task={t} onDone={() => setEditingId(null)} />
                  ) : (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{t.description}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-indigo-600">{t.reward.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-700">{t.availableCount}</td>
                      <td className="px-4 py-3"><DifficultyBadge d={t.difficulty} /></td>
                      <td className="px-4 py-3 text-gray-600">{t.completionsToday} / {t.totalCompletions}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{t.type}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditingId(t.id)}
                          className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
                {data?.tasks.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
