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
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Update Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-gray-500">Set a new password for <span className="font-semibold text-gray-800">{admin.username}</span>. Minimum 6 characters.</p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${confirmPassword && !passwordsMatch ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
          {confirmPassword && passwordsMatch && newPassword.length >= 6 && <p className="text-xs text-green-600 mt-1">Passwords match ✓</p>}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={updateMut.isPending}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => updateMut.mutate()} disabled={!passwordValid || updateMut.isPending}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
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
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Delete Admin</h3>
          <p className="text-sm text-gray-500 mt-1">
            Are you sure you want to delete <span className="font-semibold text-gray-800">{admin.username}</span>? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleteMut.isPending}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
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
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
        <p className="text-gray-500 text-sm mt-1">Manage administrator accounts</p>
      </div>

      {/* Create Admin */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-indigo-600 shrink-0" />
          <h2 className="text-base font-semibold text-gray-800">Create New Admin</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Min. 3 characters"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${confirmPassword && !passwordsMatch ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            </div>
          </div>
        </div>

        <button
          onClick={() => createMut.mutate()}
          disabled={!formValid || createMut.isPending}
          className="mt-4 w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {createMut.isPending ? "Creating…" : "Create Admin"}
        </button>
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">All Admins</h2>
          <p className="text-xs text-gray-400 mt-0.5">{data?.admins.length ?? 0} total</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(data?.admins ?? []).map((a: AdminItem) => {
              const isRoot = a.id === ROOT_ADMIN_ID;
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                    {a.username.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{a.username}</span>
                      {isRoot && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                          <Shield className="h-3 w-3" /> Root
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Actions — hidden for root admin */}
                  {!isRoot && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPasswordAdmin(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap">
                        <KeyRound className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Update Password</span>
                        <span className="sm:hidden">Password</span>
                      </button>
                      <button
                        onClick={() => setDeleteAdmin(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
            {data?.admins.length === 0 && (
              <li className="px-5 py-10 text-center text-gray-400 text-sm">No admins found</li>
            )}
          </ul>
        )}
      </div>

      {passwordAdmin && (
        <PasswordModal admin={passwordAdmin} onClose={() => setPasswordAdmin(null)} />
      )}
      {deleteAdmin && (
        <DeleteConfirmModal
          admin={deleteAdmin}
          onClose={() => setDeleteAdmin(null)}
          onDeleted={() => setDeleteAdmin(null)}
        />
      )}
    </div>
  );
}
