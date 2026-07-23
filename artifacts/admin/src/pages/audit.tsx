import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, AuditEntry } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Audit() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => api.auditLog(page),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">All admin actions are recorded here</p>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.entries ?? []).map((e: AuditEntry) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{e.adminUsername}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{e.action}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">
                      {e.targetType ? `${e.targetType}${e.targetId ? ` #${e.targetId}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs">
                      {e.details ? (
                        <pre className="text-xs font-mono bg-muted/40 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {data?.entries.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No audit entries yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {(data?.totalPages ?? 0) > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {data?.totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(data!.totalPages, p + 1))} disabled={page === data?.totalPages}
                className="p-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
