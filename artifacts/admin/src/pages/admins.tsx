import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Plus, KeyRound, X, Trash2, Shield } from "lucide-react";

const ROOT_ADMIN_ID = 1;

function PasswordModal({ admin, onClose }: { admin: AdminItem; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 6 && passwordsMatch;

  const updateMut = useMutation({
    mutationFn: () => api.updateAdminPassword(admin.id, newPassword),
    onSuccess: () => {
      toast({ title: "Password updated successfully" });
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Update Password</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Set a new password for <span className="font-semibold text-foreground">{admin.username}</span>. Minimum 6 characters.</p>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
          <div className="relative">
            <input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password"
              className="w-full px-3 py-2 pr-10 border border-input bg-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Confirm Password</label>
          <div className="relative">
            <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password"
              className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${confirmPassword && !passwordsMatch ? "border-destructive bg-destructive/5" : "border-input"}`} />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
          {confirmPassword && passwordsMatch && newPassword.length >= 6 && <p className="text-xs text-emerald-600 mt-1">Passwords match ✓</p>}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={updateMut.isPending}
            className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => updateMut.mutate()} disabled={!passwordValid || updateMut.isPending}
            className="flex-1 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors">
            {updateMut.isPending ? "Saving…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ admin, onClose, onDeleted }: { admin: AdminItem; onClose: () => void; onDeleted: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: () => api.deleteAdmin(admin.id),
    onSuccess: () => {
      toast({ title: "Admin deleted successfully" });
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
      onDeleted();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Delete Admin</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Are you sure you want to delete <span className="font-semibold text-foreground">{admin.username}</span>? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleteMut.isPending}
            className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}
            className="flex-1 py-2 bg-destructive hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {deleteMut.isPending ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admins() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordAdmin, setPasswordAdmin] = useState<AdminItem | null>(null);
  const [deleteAdmin, setDeleteAdmin] = useState<AdminItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => api.listAdmins(),
  });

  const passwordsMatch = password === confirmPassword;
  const formValid = username.trim().length >= 3 && password.length >= 6 && passwordsMatch;

  const createMut = useMutation({
    mutationFn: () => api.createAdmin(username.trim(), password),
    onSuccess: () => {
      toast({ title: "Admin created successfully" });
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
      setUsername(""); setPassword(""); setConfirmPassword("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Users</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage administrator accounts</p>
      </div>

      {/* Create Admin */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold text-foreground">Create New Admin</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Min. 3 characters"
              className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 pr-10 border border-input bg-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${confirmPassword && !passwordsMatch ? "border-destructive bg-destructive/5" : "border-input"}`} />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
            </div>
          </div>
        </div>

        <button onClick={() => createMut.mutate()} disabled={!formValid || createMut.isPending}
          className="mt-4 w-full sm:w-auto px-5 py-2.5 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors">
          {createMut.isPending ? "Creating…" : "Create Admin"}
        </button>
      </div>

      {/* Admin List */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">All Admins</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{data?.admins.length ?? 0} total</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(data?.admins ?? []).map((a: AdminItem) => {
              const isRoot = a.id === ROOT_ADMIN_ID;
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {a.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{a.username}</span>
                      {isRoot && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                          <Shield className="h-3 w-3" /> Root
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  {!isRoot && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setPasswordAdmin(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors whitespace-nowrap">
                        <KeyRound className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Update Password</span>
                        <span className="sm:hidden">Password</span>
                      </button>
                      <button onClick={() => setDeleteAdmin(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/5 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
            {data?.admins.length === 0 && (
              <li className="px-5 py-10 text-center text-muted-foreground text-sm">No admins found</li>
            )}
          </ul>
        )}
      </div>

      {passwordAdmin && <PasswordModal admin={passwordAdmin} onClose={() => setPasswordAdmin(null)} />}
      {deleteAdmin && <DeleteConfirmModal admin={deleteAdmin} onClose={() => setDeleteAdmin(null)} onDeleted={() => setDeleteAdmin(null)} />}
    </div>
  );
}
