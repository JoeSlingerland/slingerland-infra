"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full font-medium">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Registreren...
        </>
      ) : (
        "Registreren"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUp, null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-medium">Account aanmaken</CardTitle>
        <CardDescription className="font-medium">Registreer om te beginnen</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded font-medium">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded font-medium">
              {state.success}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-medium">
              Volledige Naam
            </label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Je volledige naam"
              required
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="je@voorbeeld.nl"
              required
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Wachtwoord
            </label>
            <Input id="password" name="password" type="password" required className="font-medium" />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium">
              Account Type
            </label>
            <Select name="role" defaultValue="employee">
              <SelectTrigger className="font-medium">
                <SelectValue placeholder="Selecteer account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee" className="font-medium">
                  Werknemer
                </SelectItem>
                <SelectItem value="admin" className="font-medium">
                  Beheerder
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SubmitButton />

          <div className="text-center text-sm font-medium text-muted-foreground">
            Al een account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Inloggen
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
