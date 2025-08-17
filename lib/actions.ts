"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data ontbreekt" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const role = formData.get("role") || "employee"

  if (!email || !password || !fullName) {
    return { error: "Email, wachtwoord en naam zijn verplicht" }
  }

  if (password.toString().length < 6) {
    return { error: "Wachtwoord moet minimaal 6 karakters lang zijn" }
  }

  const supabase = createClient()

  try {
    // First check if user already exists
    const { data: existingUser } = await supabase
      .from("auth.users")
      .select("email")
      .eq("email", email.toString())
      .single()

    if (existingUser) {
      return { error: "Dit email adres is al geregistreerd" }
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
        data: {
          full_name: fullName.toString(),
          role: role.toString(),
        },
      },
    })

    if (error) {
      console.error("Supabase signup error:", error)

      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        return { error: "Dit email adres is al geregistreerd" }
      }
      if (error.message.includes("Password") || error.message.includes("password")) {
        return { error: "Wachtwoord moet minimaal 6 karakters lang zijn" }
      }
      if (error.message.includes("email")) {
        return { error: "Ongeldig email adres" }
      }

      return { error: `Registratie mislukt: ${error.message}` }
    }

    if (!data.user) {
      return { error: "Account aanmaken mislukt. Probeer het opnieuw." }
    }

    // If email confirmation is required
    if (data.user && !data.user.email_confirmed_at) {
      return {
        success: "Account aangemaakt! Controleer je email om je account te bevestigen en log daarna in.",
      }
    }

    // If no email confirmation needed, redirect to login
    return {
      success: "Account succesvol aangemaakt! Je kunt nu inloggen.",
    }
  } catch (error) {
    console.error("Unexpected signup error:", error)
    return { error: "Er is een onverwachte fout opgetreden. Probeer het opnieuw." }
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
