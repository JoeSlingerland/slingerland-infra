"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Bell, Shield, Building, Save, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "admin" | "employee"
  hourly_rate: number
}

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile settings
  const [fullName, setFullName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)

  const [hourlyRate, setHourlyRate] = useState("")
  const [editingRate, setEditingRate] = useState(false)

  // App settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [desktopNotifications, setDesktopNotifications] = useState(false)
  const [autoSaveTime, setAutoSaveTime] = useState(true)

  // Company settings (admin only)
  const [companyName, setCompanyName] = useState("Mijn Bedrijf")
  const [defaultHourlyRate, setDefaultHourlyRate] = useState("50")
  const [currency, setCurrency] = useState("EUR")

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

        if (profile) {
          setUserProfile(profile)
          setFullName(profile.full_name || "")
          setHourlyRate((profile.hourly_rate || 50).toString())
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async () => {
    if (!userProfile) return

    setSaving(true)
    try {
      const { error } = await supabase.from("users").update({ full_name: fullName }).eq("id", userProfile.id)

      if (error) throw error

      setUserProfile({ ...userProfile, full_name: fullName })

      // Show success message (you could add a toast here)
      console.log("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const updateHourlyRate = async () => {
    if (!userProfile || !hourlyRate) return

    setSaving(true)
    try {
      const newRate = Number.parseFloat(hourlyRate)
      if (isNaN(newRate) || newRate <= 0) {
        alert("Voer een geldig uurtarief in")
        return
      }

      const { error } = await supabase.from("users").update({ hourly_rate: newRate }).eq("id", userProfile.id)

      if (error) throw error

      setUserProfile({ ...userProfile, hourly_rate: newRate })
      setEditingRate(false)

      console.log("Hourly rate updated successfully")
    } catch (error) {
      console.error("Error updating hourly rate:", error)
      alert("Fout bij het updaten van uurtarief")
    } finally {
      setSaving(false)
    }
  }

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Wachtwoorden komen niet overeen")
      return
    }

    if (newPassword.length < 6) {
      alert("Wachtwoord moet minimaal 6 karakters lang zijn")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      console.log("Password updated successfully")
    } catch (error) {
      console.error("Error updating password:", error)
      alert("Fout bij het updaten van wachtwoord")
    } finally {
      setSaving(false)
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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-medium">Instellingen</h1>
              <p className="text-muted-foreground mt-1 font-medium">Beheer je profiel en app-instellingen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="font-medium">Profiel</CardTitle>
                <p className="text-sm text-muted-foreground font-medium">Beheer je persoonlijke informatie</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{userProfile?.full_name || userProfile?.email}</p>
                <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                <Badge variant={userProfile?.role === "admin" ? "default" : "secondary"} className="mt-1">
                  {userProfile?.role === "admin" ? "Beheerder" : "Werknemer"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="font-medium">
                    Volledige Naam
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Voer je naam in..."
                    className="font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="font-medium">
                    Email
                  </Label>
                  <Input id="email" value={userProfile?.email || ""} disabled className="font-medium bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">Email kan niet worden gewijzigd</p>
                </div>
                {userProfile?.role === "employee" && (
                  <div>
                    <Label htmlFor="hourlyRate" className="font-medium">
                      Uurtarief
                    </Label>
                    {editingRate ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            id="hourlyRate"
                            type="number"
                            step="0.50"
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(e.target.value)}
                            placeholder="50.00"
                            className="font-medium pl-8"
                          />
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            €
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={updateHourlyRate} disabled={saving} className="font-medium">
                            {saving ? "Opslaan..." : "Opslaan"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRate(false)
                              setHourlyRate((userProfile?.hourly_rate || 50).toString())
                            }}
                            className="font-medium"
                          >
                            Annuleren
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={`€${userProfile?.hourly_rate || 50}/uur`}
                            disabled
                            className="font-medium bg-muted flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRate(true)}
                            className="font-medium"
                          >
                            Bewerken
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Je kunt je eigen uurtarief aanpassen</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Wachtwoord Wijzigen</h4>
                <div>
                  <Label htmlFor="newPassword" className="font-medium">
                    Nieuw Wachtwoord
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nieuw wachtwoord..."
                      className="font-medium pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="font-medium">
                    Bevestig Wachtwoord
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Bevestig wachtwoord..."
                    className="font-medium"
                  />
                </div>
                <Button
                  onClick={updatePassword}
                  disabled={!newPassword || !confirmPassword || saving}
                  size="sm"
                  className="font-medium"
                >
                  Wachtwoord Updaten
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={updateProfile} disabled={saving} className="font-medium">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Opslaan..." : "Profiel Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="font-medium">Notificaties</CardTitle>
                <p className="text-sm text-muted-foreground font-medium">Beheer je notificatie voorkeuren</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notificaties</p>
                  <p className="text-sm text-muted-foreground">
                    Ontvang updates over projecten en tijdregistraties via email
                  </p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Desktop Notificaties</p>
                  <p className="text-sm text-muted-foreground">Toon browser notificaties voor belangrijke updates</p>
                </div>
                <Switch checked={desktopNotifications} onCheckedChange={setDesktopNotifications} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Automatisch Opslaan</p>
                  <p className="text-sm text-muted-foreground">Sla tijdregistraties automatisch op tijdens het typen</p>
                </div>
                <Switch checked={autoSaveTime} onCheckedChange={setAutoSaveTime} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Settings (Admin Only) */}
        {userProfile?.role === "admin" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="font-medium">Bedrijfsinstellingen</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">Beheer algemene bedrijfsinstellingen</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="companyName" className="font-medium">
                    Bedrijfsnaam
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Voer bedrijfsnaam in..."
                    className="font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultRate" className="font-medium">
                    Standaard Uurtarief
                  </Label>
                  <div className="relative">
                    <Input
                      id="defaultRate"
                      type="number"
                      value={defaultHourlyRate}
                      onChange={(e) => setDefaultHourlyRate(e.target.value)}
                      placeholder="50"
                      className="font-medium pl-8"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Facturering Instellingen</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="currency" className="font-medium">
                      Valuta
                    </Label>
                    <Input
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="EUR"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <Label className="font-medium">BTW Percentage</Label>
                    <Input type="number" placeholder="21" className="font-medium" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button className="font-medium">
                  <Save className="w-4 h-4 mr-2" />
                  Bedrijfsinstellingen Opslaan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="font-medium">Beveiliging</CardTitle>
                <p className="text-sm text-muted-foreground font-medium">Beheer je account beveiliging</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Twee-factor authenticatie</p>
                <p className="text-sm text-muted-foreground">Extra beveiliging voor je account</p>
              </div>
              <Button variant="outline" size="sm" className="font-medium bg-transparent">
                Instellen
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Actieve sessies</p>
                <p className="text-sm text-muted-foreground">Beheer waar je bent ingelogd</p>
              </div>
              <Button variant="outline" size="sm" className="font-medium bg-transparent">
                Bekijken
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
              <div>
                <p className="font-medium text-red-600">Account verwijderen</p>
                <p className="text-sm text-muted-foreground">Permanent je account en alle data verwijderen</p>
              </div>
              <Button variant="destructive" size="sm" className="font-medium">
                Verwijderen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
