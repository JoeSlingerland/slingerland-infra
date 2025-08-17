"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import ProjectDashboard from "@/components/project-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "admin" | "employee"
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error loading user profile:", error)
        if (error.code === "PGRST116") {
          // No rows returned
          const { data: authUser } = await supabase.auth.getUser()
          if (authUser.user) {
            const newProfile = {
              id: authUser.user.id,
              email: authUser.user.email,
              full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split("@")[0] || "Gebruiker",
              role: "employee" as const,
            }

            const { data: createdProfile, error: createError } = await supabase
              .from("users")
              .insert([newProfile])
              .select()
              .single()

            if (!createError && createdProfile) {
              setUserProfile(createdProfile)
            }
          }
        }
      } else if (data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-medium">Laden...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-medium">ProjectTracker</CardTitle>
            <p className="text-muted-foreground font-medium">Log in om je projecten en uren te beheren</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/auth/login">
              <Button className="w-full font-medium">Inloggen</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" className="w-full font-medium bg-transparent">
                Account Aanmaken
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <ProjectDashboard user={user} userProfile={userProfile} />
}
