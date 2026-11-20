import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { EmptyState, LoadingState, Notice, PageHeading, Panel, StatusPill } from '@/components/ui'
import { userApi } from '@/lib/api'
import { shortDate } from '@/lib/format'
import { useAuth } from '@/lib/use-auth'
import type { ApiPage, User, UserCreateInput, UserUpdateInput } from '@/types/api'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [result, setResult] = useState<ApiPage<User> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<User['role']>('staff')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setResult(await userApi.list(page))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    let active = true
    userApi
      .list(page)
      .then((response) => {
        if (active) setResult(response)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load users.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page])

  function openCreate() {
    setEditing(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('staff')
    setFormOpen(true)
    setError('')
    setSuccess('')
  }

  function openEdit(item: User) {
    setEditing(item)
    setName(item.name)
    setEmail(item.email)
    setPassword('')
    setRole(item.role)
    setFormOpen(true)
    setError('')
    setSuccess('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      if (editing) {
        const input: UserUpdateInput = { name: name.trim(), email: email.trim(), role }
        if (password) input.password = password
        await userApi.update(editing.id, input)
        setSuccess(`${name.trim()} was updated.`)
      } else {
        const input: UserCreateInput = { name: name.trim(), email: email.trim(), password, role }
        await userApi.create(input)
        setSuccess(`${name.trim()} was added to the workspace.`)
      }
      setFormOpen(false)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save user.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(item: User) {
    if (item.id === currentUser?.id) return
    if (!window.confirm(`Delete ${item.name}'s account? This cannot be undone.`)) return
    setError('')
    setSuccess('')
    try {
      await userApi.remove(item.id)
      setSuccess(`${item.name}'s account was deleted.`)
      if (result?.data.length === 1 && page > 1) setPage((value) => value - 1)
      else await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete user.')
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="User management"
        description="Manage workspace access for administrators and staff."
        actions={
          <button type="button" onClick={openCreate} className="rounded-xl bg-[#101c2c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
            + Add user
          </button>
        }
      />
      {error && <div className="mb-5"><Notice>{error}</Notice></div>}
      {success && <div className="mb-5"><Notice tone="success">{success}</Notice></div>}
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-semibold text-slate-800">{result?.total ?? 0} workspace users</p>
        </div>
        {loading ? (
          <LoadingState label="Loading workspace users…" />
        ) : result?.data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Name</th>
                  <th className="px-5 py-3.5 font-semibold">Email</th>
                  <th className="px-5 py-3.5 font-semibold">Role</th>
                  <th className="px-5 py-3.5 font-semibold">Added</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {item.name}{item.id === currentUser?.id && <span className="ml-2 text-[10px] font-medium text-slate-400">You</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{item.email}</td>
                    <td className="px-5 py-4"><StatusPill value={item.role} /></td>
                    <td className="px-5 py-4 text-slate-500">{item.created_at ? shortDate(item.created_at) : '—'}</td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => openEdit(item)} className="mr-3 text-xs font-semibold text-teal-700 hover:text-teal-900">Edit</button>
                      <button
                        type="button"
                        disabled={item.id === currentUser?.id}
                        onClick={() => void remove(item)}
                        title={item.id === currentUser?.id ? 'You cannot delete your own account.' : 'Delete user'}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No users found" detail="Add an account to invite a teammate to the workspace." />
        )}
        {result && result.last_page > 1 && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3.5">
            <button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Previous</button>
            <span className="text-xs text-slate-500">Page {page} of {result.last_page}</span>
            <button type="button" disabled={page >= result.last_page} onClick={() => { setLoading(true); setPage((value) => value + 1) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Next</button>
          </div>
        )}
      </Panel>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Workspace access</p>
              <h2 id="user-dialog-title" className="mt-1 text-xl font-semibold text-slate-900">{editing ? 'Edit user' : 'Add user'}</h2>
            </div>
            <form onSubmit={submit} className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Full name</span>
                <input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Email address</span>
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">{editing ? 'New password (optional)' : 'Password'}</span>
                <input
                  type="password"
                  required={!editing}
                  minLength={10}
                  disabled={editing?.id === currentUser?.id}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={editing ? 'Leave blank to keep current password' : 'At least 10 characters'}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"
                />
                {editing?.id === currentUser?.id && <span className="mt-1 block text-xs text-slate-400">Your current session cannot reset its own password here.</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Role</span>
                <select value={role} onChange={(event) => {
                  if (event.target.value === 'admin' || event.target.value === 'staff') setRole(event.target.value)
                }} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500">
                  <option value="staff">Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              {error && <Notice>{error}</Notice>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[#101c2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? 'Saving…' : 'Save user'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
