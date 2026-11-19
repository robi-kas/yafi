"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Panel, PanelHeader, PanelBody } from "@/components/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "@/components/icons"
import { cn } from "@/lib/utils"

type Status = { kind: "ok" | "error"; text: string } | null

function StatusLine({ status }: { status: Status }) {
  if (!status) return null
  const Icon = status.kind === "ok" ? CheckCircle2 : AlertCircle
  return (
    <p className={cn("flex items-start gap-1.5 text-xs", status.kind === "ok" ? "text-profit" : "text-destructive")}>
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{status.text}</span>
    </p>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-5 first:pt-0 last:pb-0 md:grid-cols-[220px_1fr] md:gap-6">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function ProfileSettings() {
  const user = useCurrentUser()
  const params = useSearchParams()

  const [name, setName] = useState("")
  const [nameStatus, setNameStatus] = useState<Status>(null)
  const [savingName, setSavingName] = useState(false)

  const [email, setEmail] = useState("")
  const [emailStatus, setEmailStatus] = useState<Status>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [pwStatus, setPwStatus] = useState<Status>(null)
  const [savingPw, setSavingPw] = useState(false)

  const currentName = (user?.user_metadata?.full_name as string | undefined) || ""
  const pendingEmail = user?.new_email

  useEffect(() => {
    if (user) {
      setName(currentName)
      setEmail(user.email || "")
    }
  }, [user?.id, currentName, user?.email]) // eslint-disable-line react-hooks/exhaustive-deps

  // Result of clicking a confirmation link (see /auth/callback).
  useEffect(() => {
    const auth = params.get("auth")
    if (auth === "confirmed") setEmailStatus({ kind: "ok", text: "Email confirmation received. If you changed your email, it's updated once both links are confirmed." })
    if (auth === "error") setEmailStatus({ kind: "error", text: params.get("message") || "That confirmation link is invalid or has expired." })
  }, [params])

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameStatus(null)
    const trimmed = name.trim()
    if (!trimmed) return setNameStatus({ kind: "error", text: "Name can't be empty." })
    if (trimmed.length > 60) return setNameStatus({ kind: "error", text: "Keep it under 60 characters." })
    setSavingName(true)
    const { error } = await createClient().auth.updateUser({ data: { full_name: trimmed } })
    setSavingName(false)
    setNameStatus(error ? { kind: "error", text: error.message } : { kind: "ok", text: "Name updated." })
  }

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailStatus(null)
    const next = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return setEmailStatus({ kind: "error", text: "Enter a valid email address." })
    if (next === (user?.email || "").toLowerCase()) return setEmailStatus({ kind: "error", text: "That's already your email." })
    setSavingEmail(true)
    const { error } = await createClient().auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/settings` }
    )
    setSavingEmail(false)
    setEmailStatus(
      error
        ? { kind: "error", text: error.message }
        : { kind: "ok", text: `Check your inbox: we sent a confirmation link to ${next} (and possibly your current address). Your email changes after you confirm.` }
    )
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwStatus(null)
    if (password.length < 8) return setPwStatus({ kind: "error", text: "Use at least 8 characters." })
    if (password !== confirm) return setPwStatus({ kind: "error", text: "The passwords don't match." })
    setSavingPw(true)
    const { error } = await createClient().auth.updateUser({ password })
    setSavingPw(false)
    if (error) {
      const needsReauth = /reauthenticat|recent/i.test(error.message)
      setPwStatus({
        kind: "error",
        text: needsReauth ? "For security, sign out and sign in again, then change your password." : error.message,
      })
      return
    }
    setPassword("")
    setConfirm("")
    setPwStatus({ kind: "ok", text: "Password changed." })
  }

  return (
    <Panel>
      <PanelHeader title="Profile" description="Your name, sign-in email and password" icon={User} />
      <PanelBody className="divide-y divide-border">
        <Section title="Display name" description="Shown in the sidebar and your dashboard greeting.">
          <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="profile-name" className="sr-only">Display name</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={60} />
            <Button type="submit" variant="outline" disabled={savingName || !user || name.trim() === currentName}>
              {savingName && <Loader2 className="animate-spin" />} Save
            </Button>
          </form>
          <StatusLine status={nameStatus} />
        </Section>

        <Section title="Email" description="Used to sign in. Changing it requires confirming a link we email you.">
          <form onSubmit={saveEmail} className="flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="profile-email" className="sr-only">Email</Label>
            <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            <Button type="submit" variant="outline" disabled={savingEmail || !user || email.trim().toLowerCase() === (user?.email || "").toLowerCase()}>
              {savingEmail && <Loader2 className="animate-spin" />} Change email
            </Button>
          </form>
          {pendingEmail && !emailStatus && (
            <p className="text-xs text-warning">Waiting for confirmation of {pendingEmail}. Check that inbox.</p>
          )}
          <StatusLine status={emailStatus} />
        </Section>

        <Section title="Password" description="At least 8 characters. You stay signed in on this device.">
          <form onSubmit={savePassword} className="space-y-2">
            <div className="relative">
              <Label htmlFor="profile-pw" className="sr-only">New password</Label>
              <Input
                id="profile-pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Label htmlFor="profile-pw2" className="sr-only">Confirm new password</Label>
              <Input
                id="profile-pw2"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <Button type="submit" variant="outline" disabled={savingPw || !user || !password}>
                {savingPw && <Loader2 className="animate-spin" />} Update password
              </Button>
            </div>
          </form>
          <StatusLine status={pwStatus} />
        </Section>
      </PanelBody>
    </Panel>
  )
}
