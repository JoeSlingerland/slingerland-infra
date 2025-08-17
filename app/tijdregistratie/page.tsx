import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import TimeTrackingDashboard from "@/components/time-tracking-dashboard"

export default async function TimeTrackingPage() {
  // Get the user from the server
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile with role
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", user.id).single()

  return <TimeTrackingDashboard user={user} userProfile={userProfile} />
}
