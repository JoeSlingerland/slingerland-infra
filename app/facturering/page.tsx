"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Download, Eye, Search, DollarSign, Clock, FileText, Send, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface TimeEntry {
  id: string
  project_id: string
  user_id: string
  description: string
  hours: number
  date: string
  user_name: string
  user_hourly_rate: number
}

interface Project {
  id: string
  name: string
  client: string
  status: string
  hourly_rate: number
  created_by: string
  creator_name: string
}

interface BillingData {
  project: Project
  timeEntries: TimeEntry[]
  totalHours: number
  totalAmount: number
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "admin" | "employee"
  hourly_rate?: number
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingData[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState<BillingData | null>(null)
  const [dateFilter, setDateFilter] = useState("")
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get user profile to check role
      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

      if (!profile) {
        router.push("/auth/login")
        return
      }

      // Check if user is admin
      if (profile.role !== "admin") {
        router.push("/")
        return
      }

      setUserProfile(profile)
      setAuthLoading(false)

      // Load billing data only if user is admin
      await loadBillingData()
    } catch (error) {
      console.error("Error checking authentication:", error)
      router.push("/auth/login")
    }
  }

  const loadBillingData = async () => {
    try {
      // Load projects that are ready to invoice
      const { data: projectsData } = await supabase
        .from("projects")
        .select(`
          *,
          users!projects_created_by_fkey(full_name)
        `)
        .eq("status", "to-invoice")

      // Load all time entries for these projects
      const { data: timeEntriesData } = await supabase.from("time_entries").select(`
          *,
          users!time_entries_user_id_fkey(full_name, hourly_rate)
        `)

      if (projectsData && timeEntriesData) {
        const formattedBillingData: BillingData[] = projectsData.map((project: any) => {
          const projectTimeEntries = timeEntriesData
            .filter((entry: any) => entry.project_id === project.id)
            .map((entry: any) => ({
              ...entry,
              user_name: entry.users?.full_name || "Unknown",
              user_hourly_rate: entry.users?.hourly_rate || 50,
            }))

          const totalHours = projectTimeEntries.reduce((sum, entry) => sum + entry.hours, 0)
          const totalAmount = totalHours * project.hourly_rate

          return {
            project: {
              ...project,
              creator_name: project.users?.full_name || "Unknown",
            },
            timeEntries: projectTimeEntries,
            totalHours,
            totalAmount,
          }
        })

        setBillingData(formattedBillingData)
      }
    } catch (error) {
      console.error("Error loading billing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (data: BillingData) => {
    const csvContent = [
      ["Project", "Client", "Date", "Employee", "Description", "Hours", "Rate", "Amount"],
      ...data.timeEntries.map((entry) => [
        data.project.name,
        data.project.client,
        new Date(entry.date).toLocaleDateString("nl-NL"),
        entry.user_name,
        entry.description,
        entry.hours.toString(),
        `€${data.project.hourly_rate}`,
        `€${(entry.hours * data.project.hourly_rate).toFixed(2)}`,
      ]),
      ["", "", "", "", "TOTAAL", data.totalHours.toString(), "", `€${data.totalAmount.toFixed(2)}`],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `factuur-${data.project.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const sendToMoneybird = async (data: BillingData) => {
    setSendingInvoice(data.project.id)
    try {
      // Simulate API call to Moneybird
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create invoice data for Moneybird
      const invoiceData = {
        contact: {
          company_name: data.project.client,
        },
        details_attributes: data.timeEntries.map((entry) => ({
          description: `${entry.description} (${entry.user_name})`,
          amount: (entry.hours * data.project.hourly_rate).toFixed(2),
          tax_rate_id: "21", // 21% BTW
          period: new Date(entry.date).toISOString().split("T")[0],
        })),
        reference: `Project: ${data.project.name}`,
        invoice_date: new Date().toISOString().split("T")[0],
      }

      console.log("Sending to Moneybird:", invoiceData)

      // Mark project as completed after successful invoice
      await markProjectAsCompleted(data.project.id)

      alert(`Factuur voor ${data.project.name} succesvol verzonden naar Moneybird!`)
    } catch (error) {
      console.error("Error sending to Moneybird:", error)
      alert("Fout bij het verzenden naar Moneybird")
    } finally {
      setSendingInvoice(null)
    }
  }

  const sendToTwinfield = async (data: BillingData) => {
    setSendingInvoice(data.project.id)
    try {
      // Simulate API call to Twinfield
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create invoice data for Twinfield
      const invoiceData = {
        customer: data.project.client,
        invoiceLines: data.timeEntries.map((entry) => ({
          description: `${data.project.name} - ${entry.description}`,
          quantity: entry.hours,
          unitPrice: data.project.hourly_rate,
          amount: entry.hours * data.project.hourly_rate,
          employee: entry.user_name,
          date: entry.date,
        })),
        totalAmount: data.totalAmount,
        reference: `PRJ-${data.project.name.replace(/\s+/g, "-").toUpperCase()}`,
      }

      console.log("Sending to Twinfield:", invoiceData)

      // Mark project as completed after successful invoice
      await markProjectAsCompleted(data.project.id)

      alert(`Factuur voor ${data.project.name} succesvol verzonden naar Twinfield!`)
    } catch (error) {
      console.error("Error sending to Twinfield:", error)
      alert("Fout bij het verzenden naar Twinfield")
    } finally {
      setSendingInvoice(null)
    }
  }

  const markProjectAsCompleted = async (projectId: string) => {
    try {
      const { error } = await supabase.from("projects").update({ status: "completed" }).eq("id", projectId)

      if (error) throw error

      // Remove from billing data
      setBillingData((prev) => prev.filter((data) => data.project.id !== projectId))
    } catch (error) {
      console.error("Error marking project as completed:", error)
    }
  }

  const filteredBillingData = billingData.filter(
    (data) =>
      data.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.project.client.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalBillableAmount = filteredBillingData.reduce((sum, data) => sum + data.totalAmount, 0)
  const totalBillableHours = filteredBillingData.reduce((sum, data) => sum + data.totalHours, 0)

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-medium">Toegang controleren...</p>
        </div>
      </div>
    )
  }

  if (!userProfile || userProfile.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-medium mb-2">Toegang Geweigerd</h2>
            <p className="text-muted-foreground mb-6 font-medium">
              Deze pagina is alleen toegankelijk voor beheerders.
            </p>
            <Link href="/">
              <Button className="font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
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
              <h1 className="text-2xl font-medium">Facturering</h1>
              <p className="text-muted-foreground mt-1 font-medium">
                Beheer facturen en exporteer naar Moneybird/Twinfield
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zoek projecten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totaal Te Factureren</p>
                  <p className="text-2xl font-medium">€{totalBillableAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totale Uren</p>
                  <p className="text-2xl font-medium">{totalBillableHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Te Factureren Projecten</p>
                  <p className="text-2xl font-medium">{filteredBillingData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {filteredBillingData.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen projecten te factureren</h3>
                <p className="text-muted-foreground font-medium">
                  Er zijn momenteel geen projecten met de status "Te Factureren"
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredBillingData.map((data) => (
              <Card key={data.project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium">{data.project.name}</h3>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Te Factureren
                        </Badge>
                      </div>
                      <p className="text-muted-foreground font-medium mb-4">{data.project.client}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Totale Uren</p>
                          <p className="text-lg font-medium">{data.totalHours}h</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Totaal Bedrag</p>
                          <p className="text-lg font-medium">€{data.totalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Project Tarief</p>
                          <p className="text-lg font-medium">€{data.project.hourly_rate}/u</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Tijdregistraties</p>
                          <p className="text-lg font-medium">{data.timeEntries.length}</p>
                        </div>
                      </div>

                      {/* Recent Time Entries Preview */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Recente Tijdregistraties:</p>
                        {data.timeEntries.slice(0, 3).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{entry.user_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{entry.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.user_name} • {new Date(entry.date).toLocaleDateString("nl-NL")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{entry.hours}h</p>
                              <p className="text-xs text-muted-foreground">
                                €{(entry.hours * data.project.hourly_rate).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {data.timeEntries.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{data.timeEntries.length - 3} meer...</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-6">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProject(data)}
                        className="font-medium"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                      <Button size="sm" onClick={() => exportToCSV(data)} variant="outline" className="font-medium">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => sendToMoneybird(data)}
                        disabled={sendingInvoice === data.project.id}
                        className="font-medium bg-green-600 hover:bg-green-700"
                      >
                        {sendingInvoice === data.project.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Moneybird
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => sendToTwinfield(data)}
                        disabled={sendingInvoice === data.project.id}
                        className="font-medium bg-blue-600 hover:bg-blue-700"
                      >
                        {sendingInvoice === data.project.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Twinfield
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[800px] max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-medium">{selectedProject.project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{selectedProject.project.client}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => exportToCSV(selectedProject)}
                    variant="outline"
                    className="font-medium"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendToMoneybird(selectedProject)}
                    disabled={sendingInvoice === selectedProject.project.id}
                    className="font-medium bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Moneybird
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendToTwinfield(selectedProject)}
                    disabled={sendingInvoice === selectedProject.project.id}
                    className="font-medium bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Twinfield
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedProject(null)} className="font-medium">
                    Sluiten
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Totale Uren</label>
                  <p className="text-lg font-medium">{selectedProject.totalHours}h</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project Tarief</label>
                  <p className="text-lg font-medium">€{selectedProject.project.hourly_rate}/u</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Totaal Bedrag</label>
                  <p className="text-lg font-medium">€{selectedProject.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Alle Tijdregistraties</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedProject.timeEntries.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-start p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">{entry.user_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{entry.user_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString("nl-NL")}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium mb-1">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.hours}h × €{selectedProject.project.hourly_rate}/u
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">€{(entry.hours * selectedProject.project.hourly_rate).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
