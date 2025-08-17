"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Clock,
  DollarSign,
  FolderOpen,
  Search,
  Bell,
  Settings,
  LogOut,
  Download,
  Filter,
  CalendarIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import Link from "next/link"

interface TimeEntry {
  id: string
  project_id: string
  user_id: string
  description: string
  hours: number
  date: string
  project_name?: string
  project_client?: string
  user_name?: string
  hourly_rate?: number
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "admin" | "employee"
  hourly_rate?: number
}

interface TimeTrackingDashboardProps {
  user: any
  userProfile: UserProfile | null
}

export default function TimeTrackingDashboard({ user, userProfile }: TimeTrackingDashboardProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [timeEntries, searchTerm, selectedUser, selectedProject, dateRange])

  const loadData = async () => {
    try {
      // Load time entries with project and user info
      let timeEntriesQuery = supabase.from("time_entries").select(`
        *,
        projects!time_entries_project_id_fkey(name, client, hourly_rate),
        users!time_entries_user_id_fkey(full_name, email, hourly_rate)
      `)

      // If not admin, only show own entries
      if (userProfile?.role !== "admin") {
        timeEntriesQuery = timeEntriesQuery.eq("user_id", user.id)
      }

      const { data: timeEntriesData } = await timeEntriesQuery.order("date", { ascending: false })

      // Load users (for admin filtering)
      if (userProfile?.role === "admin") {
        const { data: usersData } = await supabase.from("users").select("*").order("full_name")
        if (usersData) setUsers(usersData)
      }

      // Load projects
      let projectsQuery = supabase.from("projects").select("*")
      if (userProfile?.role !== "admin") {
        projectsQuery = projectsQuery.eq("created_by", user.id)
      }
      const { data: projectsData } = await projectsQuery.order("name")

      if (timeEntriesData) {
        const formattedEntries = timeEntriesData.map((entry: any) => ({
          ...entry,
          project_name: entry.projects?.name || "Unknown Project",
          project_client: entry.projects?.client || "Unknown Client",
          user_name: entry.users?.full_name || entry.users?.email || "Unknown User",
          hourly_rate: entry.users?.hourly_rate || entry.projects?.hourly_rate || 50,
        }))
        setTimeEntries(formattedEntries)
      }

      if (projectsData) setProjects(projectsData)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterEntries = () => {
    let filtered = timeEntries

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.project_client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.user_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // User filter (admin only)
    if (selectedUser !== "all" && userProfile?.role === "admin") {
      filtered = filtered.filter((entry) => entry.user_id === selectedUser)
    }

    // Project filter
    if (selectedProject !== "all") {
      filtered = filtered.filter((entry) => entry.project_id === selectedProject)
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter((entry) => new Date(entry.date) >= dateRange.from!)
    }
    if (dateRange.to) {
      filtered = filtered.filter((entry) => new Date(entry.date) <= dateRange.to!)
    }

    setFilteredEntries(filtered)
  }

  const getTotalHours = () => {
    return filteredEntries.reduce((total, entry) => total + entry.hours, 0)
  }

  const getTotalValue = () => {
    return filteredEntries.reduce((total, entry) => total + entry.hours * (entry.hourly_rate || 0), 0)
  }

  const exportToCSV = () => {
    const headers = ["Datum", "Project", "Klant", "Beschrijving", "Uren", "Uurtarief", "Waarde"]
    if (userProfile?.role === "admin") {
      headers.push("Werknemer")
    }

    const csvContent = [
      headers.join(","),
      ...filteredEntries.map((entry) => {
        const row = [
          format(new Date(entry.date), "dd-MM-yyyy"),
          `"${entry.project_name}"`,
          `"${entry.project_client}"`,
          `"${entry.description}"`,
          entry.hours.toString(),
          `€${entry.hourly_rate}`,
          `€${(entry.hours * (entry.hourly_rate || 0)).toFixed(2)}`,
        ]
        if (userProfile?.role === "admin") {
          row.push(`"${entry.user_name}"`)
        }
        return row.join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `tijdregistratie_${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    <div className="flex h-screen bg-background">
      <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-lg font-medium text-sidebar-foreground">ProjectTracker</h1>
          <div className="mt-3 flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {userProfile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {userProfile?.full_name || user.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {userProfile?.role === "admin" ? "Beheerder" : "Werknemer"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
              >
                <FolderOpen className="w-4 h-4 mr-3" />
                Projecten
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground bg-sidebar-accent font-medium"
            >
              <Clock className="w-4 h-4 mr-3" />
              Tijdregistratie
            </Button>
            {userProfile?.role === "admin" && (
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
              >
                <DollarSign className="w-4 h-4 mr-3" />
                Facturering
              </Button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
          >
            <Settings className="w-4 h-4 mr-3" />
            Instellingen
          </Button>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Uitloggen
            </Button>
          </form>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-medium">Tijdregistratie</h2>
              <p className="text-muted-foreground mt-1 font-medium">
                {userProfile?.role === "admin"
                  ? "Bekijk alle tijdregistraties voor facturering"
                  : "Bekijk je eigen tijdregistraties"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
              <Button onClick={exportToCSV} className="font-medium">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totale Uren</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getTotalHours().toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground font-medium">{filteredEntries.length} registraties</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totale Waarde</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{getTotalValue().toFixed(2)}</div>
                <p className="text-xs text-muted-foreground font-medium">
                  Gemiddeld €{getTotalHours() > 0 ? (getTotalValue() / getTotalHours()).toFixed(0) : 0}/uur
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actieve Projecten</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(filteredEntries.map((entry) => entry.project_id)).size}
                </div>
                <p className="text-xs text-muted-foreground font-medium">Verschillende projecten</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Zoeken</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Zoek in beschrijving..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 font-medium"
                    />
                  </div>
                </div>

                {userProfile?.role === "admin" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Werknemer</label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="font-medium">
                        <SelectValue placeholder="Alle werknemers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-medium">
                          Alle werknemers
                        </SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="font-medium">
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Project</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="font-medium">
                      <SelectValue placeholder="Alle projecten" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-medium">
                        Alle projecten
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="font-medium">
                          {project.name} - {project.client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Datum</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-medium bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd MMM", { locale: nl })} -{" "}
                              {format(dateRange.to, "dd MMM", { locale: nl })}
                            </>
                          ) : (
                            format(dateRange.from, "dd MMM yyyy", { locale: nl })
                          )
                        ) : (
                          "Selecteer datum"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Tijdregistraties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium">Datum</TableHead>
                      <TableHead className="font-medium">Project</TableHead>
                      <TableHead className="font-medium">Beschrijving</TableHead>
                      <TableHead className="font-medium">Uren</TableHead>
                      <TableHead className="font-medium">Tarief</TableHead>
                      <TableHead className="font-medium">Waarde</TableHead>
                      {userProfile?.role === "admin" && <TableHead className="font-medium">Werknemer</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {format(new Date(entry.date), "dd MMM yyyy", { locale: nl })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{entry.project_name}</p>
                            <p className="text-xs text-muted-foreground">{entry.project_client}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-xs">
                          <p className="truncate">{entry.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {entry.hours}h
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">€{entry.hourly_rate}</TableCell>
                        <TableCell className="font-medium">
                          €{(entry.hours * (entry.hourly_rate || 0)).toFixed(2)}
                        </TableCell>
                        {userProfile?.role === "admin" && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{entry.user_name?.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{entry.user_name}</span>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredEntries.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground font-medium">Geen tijdregistraties gevonden</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
