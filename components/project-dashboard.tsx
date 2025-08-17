"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Clock, DollarSign, FolderOpen, Search, Bell, Settings, Edit, Trash2, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"
import Link from "next/link"

interface TimeEntry {
  id: string
  project_id: string
  user_id: string
  description: string
  hours: number
  date: string
  user_name?: string
  user_hourly_rate?: number
}

interface Project {
  id: string
  name: string
  client: string
  status: "active" | "to-invoice" | "completed"
  hourly_rate: number
  created_by: string
  created_at: string
  creator_name?: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "admin" | "employee"
  hourly_rate?: number
}

interface ProjectDashboardProps {
  user: any
  userProfile: UserProfile | null
}

export default function ProjectDashboard({ user, userProfile }: ProjectDashboardProps) {
  const [projects, setProjects] = useState<any[]>([])
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [editUserRate, setEditUserRate] = useState("")

  // New state variables
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [newProjectClient, setNewProjectClient] = useState("")
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<any | null>(null)
  const [editProjectTitle, setEditProjectTitle] = useState("")
  const [editProjectClient, setEditProjectClient] = useState("")
  const [editProjectRate, setEditProjectRate] = useState("")
  const [selectedProjectForTime, setSelectedProjectForTime] = useState<any | null>(null)
  const [timeDescription, setTimeDescription] = useState("")
  const [timeHours, setTimeHours] = useState("")
  const [runningTimer, setRunningTimer] = useState<string | null>(null)
  const [selectedProjectForView, setSelectedProjectForView] = useState<any | null>(null)

  useEffect(() => {
    if (userProfile) {
      loadData()
    }
  }, [userProfile])

  const loadData = async () => {
    try {
      const { data: projectsData } = await supabase.from("projects").select(`
        *,
        users!projects_created_by_fkey(full_name)
      `)

      const { data: timeEntriesData } = await supabase.from("time_entries").select(`
        *,
        users!time_entries_user_id_fkey(full_name, hourly_rate)
      `)

      // Load all users for admin functionality
      if (userProfile?.role === "admin") {
        const { data: usersData } = await supabase.from("users").select("*").order("full_name")

        if (usersData) {
          setAllUsers(usersData)
        }
      }

      if (projectsData) {
        const formattedProjects = projectsData.map((project: any) => ({
          ...project,
          creator_name: project.users?.full_name || "Unknown",
        }))
        setProjects(formattedProjects)
      }

      if (timeEntriesData) {
        const formattedTimeEntries = timeEntriesData.map((entry: any) => ({
          ...entry,
          user_name: entry.users?.full_name || "Unknown",
          user_hourly_rate: entry.users?.hourly_rate || 50,
        }))
        setTimeEntries(formattedTimeEntries)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (newProjectTitle.trim() && newProjectClient.trim()) {
      try {
        const { data, error } = await supabase
          .from("projects")
          .insert([
            {
              name: newProjectTitle,
              client: newProjectClient,
              status: "active",
              hourly_rate: 75,
              created_by: user.id,
            },
          ])
          .select()

        if (error) throw error

        if (data) {
          const newProject = {
            ...data[0],
            creator_name: userProfile?.full_name || "You",
          }
          setProjects([...projects, newProject])
        }

        setNewProjectTitle("")
        setNewProjectClient("")
        setShowNewProjectForm(false)
      } catch (error) {
        console.error("Error creating project:", error)
      }
    }
  }

  const editProject = async () => {
    if (selectedProjectForEdit && editProjectTitle.trim() && editProjectClient.trim() && editProjectRate) {
      try {
        const { error } = await supabase
          .from("projects")
          .update({
            name: editProjectTitle,
            client: editProjectClient,
            hourly_rate: Number.parseFloat(editProjectRate),
          })
          .eq("id", selectedProjectForEdit.id)

        if (error) throw error

        const updatedProjects = projects.map((project) =>
          project.id === selectedProjectForEdit.id
            ? {
                ...project,
                name: editProjectTitle,
                client: editProjectClient,
                hourly_rate: Number.parseFloat(editProjectRate),
              }
            : project,
        )
        setProjects(updatedProjects)
        setSelectedProjectForEdit(null)
        setEditProjectTitle("")
        setEditProjectClient("")
        setEditProjectRate("")
      } catch (error) {
        console.error("Error updating project:", error)
      }
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId)

      if (error) throw error

      setProjects(projects.filter((project) => project.id !== projectId))
      setTimeEntries(timeEntries.filter((entry) => entry.project_id !== projectId))
    } catch (error) {
      console.error("Error deleting project:", error)
    }
  }

  const addTimeEntry = async () => {
    if (selectedProjectForTime && timeDescription.trim() && timeHours) {
      try {
        const { data, error } = await supabase
          .from("time_entries")
          .insert([
            {
              project_id: selectedProjectForTime,
              user_id: user.id,
              description: timeDescription,
              hours: Number.parseFloat(timeHours),
              date: new Date().toISOString().split("T")[0],
            },
          ])
          .select()

        if (error) throw error

        if (data) {
          const newEntry = {
            ...data[0],
            user_name: userProfile?.full_name || "You",
            user_hourly_rate: userProfile?.hourly_rate || 50,
          }
          setTimeEntries([...timeEntries, newEntry])
        }

        setTimeDescription("")
        setTimeHours("")
        setSelectedProjectForTime(null)
      } catch (error) {
        console.error("Error adding time entry:", error)
      }
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: any["status"]) => {
    try {
      const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", projectId)

      if (error) throw error

      setProjects(projects.map((project) => (project.id === projectId ? { ...project, status: newStatus } : project)))
    } catch (error) {
      console.error("Error updating project status:", error)
    }
  }

  const updateUserHourlyRate = async () => {
    if (editingUser && editUserRate) {
      try {
        const { error } = await supabase
          .from("users")
          .update({ hourly_rate: Number.parseFloat(editUserRate) })
          .eq("id", editingUser.id)

        if (error) throw error

        // Update local state
        setAllUsers(
          allUsers.map((u) => (u.id === editingUser.id ? { ...u, hourly_rate: Number.parseFloat(editUserRate) } : u)),
        )

        setEditingUser(null)
        setEditUserRate("")
      } catch (error) {
        console.error("Error updating user hourly rate:", error)
      }
    }
  }

  const openEditModal = (project: any) => {
    setSelectedProjectForEdit(project)
    setEditProjectTitle(project.name)
    setEditProjectClient(project.client)
    setEditProjectRate(project.hourly_rate.toString())
  }

  const openViewModal = (project: any) => {
    setSelectedProjectForView(project)
  }

  const getProjectTotalHours = (projectId: string) => {
    return timeEntries
      .filter((entry) => entry.project_id === projectId)
      .reduce((total, entry) => total + entry.hours, 0)
  }

  const getProjectTotalValue = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId)
    const projectRate = project?.hourly_rate || 75

    return timeEntries
      .filter((entry) => entry.project_id === projectId)
      .reduce((total, entry) => total + entry.hours * projectRate, 0)
  }

  const startTimer = (projectId: string) => {
    setRunningTimer(projectId)
  }

  const stopTimer = (projectId: string) => {
    setRunningTimer(null)
  }

  const getProjectsByStatus = (status: any["status"]) => {
    return projects.filter((project) => project.status === status)
  }

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("text/plain", projectId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, newStatus: any["status"]) => {
    e.preventDefault()
    const projectId = e.dataTransfer.getData("text/plain")

    if (projectId) {
      updateProjectStatus(projectId, newStatus)
    }
  }

  const canEditProject = (project: any) => {
    return userProfile?.role === "admin" || project.created_by === user.id
  }

  const ProjectCard = ({ project }: { project: any }) => {
    return (
      <Card
        draggable
        onDragStart={(e) => handleDragStart(e, project.id)}
        onClick={() => openViewModal(project)}
        className="p-2 cursor-grab hover:shadow-md transition-shadow duration-200 select-none active:cursor-grabbing leading-4 py-3 px-3 mb-3"
      >
        <div className="text-sm font-medium text-foreground leading-none">{project.name}</div>
        <div className="text-xs font-medium text-muted-foreground leading-none -mt-0.5">
          {project.client}
          {userProfile?.role === "admin" && project.created_by !== user.id && (
            <span className="ml-2 text-blue-600">• {project.creator_name}</span>
          )}
        </div>
      </Card>
    )
  }

  const DropZone = ({
    status,
    title,
    children,
  }: {
    status: any["status"]
    title: string
    children: React.ReactNode
  }) => {
    const hasProjects = getProjectsByStatus(status).length > 0

    const getBadgeClassName = () => {
      if (status === "to-invoice") {
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      }
      if (status === "completed") {
        return "bg-red-100 text-red-800 hover:bg-red-200"
      }
      return "bg-green-100 text-green-800 hover:bg-green-200"
    }

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
        className="flex flex-col h-full transition-all duration-300 ease-out rounded-xl p-4 border-2 border-dashed bg-background border-muted-foreground/30"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">{title}</h3>
          <Badge className={getBadgeClassName()} variant="secondary">
            {getProjectsByStatus(status).length}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
          {!hasProjects && (
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-xl border-muted-foreground/40 bg-muted/20">
              <p className="text-sm font-medium text-muted-foreground">Sleep projecten hierheen</p>
            </div>
          )}
        </div>
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
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground bg-sidebar-accent font-medium"
            >
              <FolderOpen className="w-4 h-4 mr-3" />
              Projecten
            </Button>
            <Link href="/tijdregistratie">
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
              >
                <Clock className="w-4 h-4 mr-3" />
                Tijdregistratie
              </Button>
            </Link>
            {userProfile?.role === "admin" && (
              <>
                <Link href="/facturering">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
                  >
                    <DollarSign className="w-4 h-4 mr-3" />
                    Facturering
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => setShowUserManagement(true)}
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Gebruikersbeheer
                </Button>
              </>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link href="/instellingen">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent font-medium"
            >
              <Settings className="w-4 h-4 mr-3" />
              Instellingen
            </Button>
          </Link>
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
              <h2 className="text-2xl font-medium">Projecten</h2>
              <p className="text-muted-foreground mt-1 font-medium">Beheer projecten en registreer uren</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Zoek projecten..." className="pl-10 w-64 font-medium" />
              </div>
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
              <Button onClick={() => setShowNewProjectForm(true)} className="font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Project
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            <DropZone status="active" title="Lopende Projecten">
              {getProjectsByStatus("active").map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </DropZone>

            <DropZone status="to-invoice" title="Te Factureren">
              {getProjectsByStatus("to-invoice").map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </DropZone>

            <DropZone status="completed" title="Afgerond">
              {getProjectsByStatus("completed").map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </DropZone>
          </div>
        </div>
      </div>

      {showNewProjectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="font-medium">Nieuw Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Projectnaam</label>
                <Input
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Voer projectnaam in..."
                  className="font-medium"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Klant</label>
                <Input
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  placeholder="Voer klantnaam in..."
                  className="font-medium"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={createProject} className="flex-1 font-medium">
                  Project Aanmaken
                </Button>
                <Button variant="outline" onClick={() => setShowNewProjectForm(false)} className="font-medium">
                  Annuleren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedProjectForTime && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="font-medium">Tijd Registreren</CardTitle>
              <p className="text-sm text-muted-foreground font-medium">
                {projects.find((p) => p.id === selectedProjectForTime)?.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Beschrijving</label>
                <Textarea
                  value={timeDescription}
                  onChange={(e) => setTimeDescription(e.target.value)}
                  placeholder="Wat heb je gedaan?"
                  rows={3}
                  className="font-medium"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Uren</label>
                <Input
                  type="number"
                  step="0.25"
                  value={timeHours}
                  onChange={(e) => setTimeHours(e.target.value)}
                  placeholder="2.5"
                  className="font-medium"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={addTimeEntry} className="flex-1 font-medium">
                  Tijd Toevoegen
                </Button>
                <Button variant="outline" onClick={() => setSelectedProjectForTime(null)} className="font-medium">
                  Annuleren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedProjectForEdit && canEditProject(selectedProjectForEdit) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="font-medium">Project Bewerken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Projectnaam</label>
                <Input
                  value={editProjectTitle}
                  onChange={(e) => setEditProjectTitle(e.target.value)}
                  placeholder="Voer projectnaam in..."
                  className="font-medium"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Klant</label>
                <Input
                  value={editProjectClient}
                  onChange={(e) => setEditProjectClient(e.target.value)}
                  placeholder="Voer klantnaam in..."
                  className="font-medium"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Uurtarief (€)</label>
                <Input
                  type="number"
                  value={editProjectRate}
                  onChange={(e) => setEditProjectRate(e.target.value)}
                  placeholder="75"
                  className="font-medium"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={editProject} className="flex-1 font-medium">
                  Opslaan
                </Button>
                <Button variant="outline" onClick={() => setSelectedProjectForEdit(null)} className="font-medium">
                  Annuleren
                </Button>
                {canEditProject(selectedProjectForEdit) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteProject(selectedProjectForEdit.id)
                      setSelectedProjectForEdit(null)
                    }}
                    className="font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedProjectForView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[600px] max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-medium">{selectedProjectForView.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    {selectedProjectForView.client}
                    {userProfile?.role === "admin" && selectedProjectForView.created_by !== user.id && (
                      <span className="ml-2 text-blue-600">• Gemaakt door {selectedProjectForView.creator_name}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canEditProject(selectedProjectForView) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(selectedProjectForView)}
                      className="font-medium"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Bewerken
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedProjectForView(null)}
                    className="font-medium"
                  >
                    Sluiten
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-sm font-medium">
                    {selectedProjectForView.status === "active" && "Actief"}
                    {selectedProjectForView.status === "to-invoice" && "Te Factureren"}
                    {selectedProjectForView.status === "completed" && "Afgerond"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Uurtarief</label>
                  <p className="text-sm font-medium">€{selectedProjectForView.hourly_rate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Totale Uren</label>
                  <p className="text-sm font-medium">{getProjectTotalHours(selectedProjectForView.id)}h</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Totale Waarde</label>
                  <p className="text-sm font-medium">€{getProjectTotalValue(selectedProjectForView.id).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Tijdregistraties</h4>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedProjectForTime(selectedProjectForView.id)
                      setSelectedProjectForView(null)
                    }}
                    className="font-medium"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Tijd Toevoegen
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {timeEntries
                    .filter((entry) => entry.project_id === selectedProjectForView.id)
                    .map((entry) => {
                      const projectRate = selectedProjectForView.hourly_rate || 75
                      const entryValue = entry.hours * projectRate

                      return (
                        <div key={entry.id} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{entry.description}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {new Date(entry.date).toLocaleDateString("nl-NL")}
                              {userProfile?.role === "admin" && entry.user_id !== user.id && (
                                <span className="ml-2 text-blue-600">• {entry.user_name}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{entry.hours}h</Badge>
                            <p className="text-xs text-muted-foreground font-medium mt-1">€{entryValue.toFixed(2)}</p>
                          </div>
                        </div>
                      )
                    })}
                  {timeEntries.filter((entry) => entry.project_id === selectedProjectForView.id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 font-medium">
                      Nog geen tijdregistraties
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showUserManagement && userProfile?.role === "admin" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[700px] max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-medium">Gebruikersbeheer</CardTitle>
                <Button variant="outline" onClick={() => setShowUserManagement(false)} className="font-medium">
                  Sluiten
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="mt-1">
                        {user.role === "admin" ? "Beheerder" : "Werknemer"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">€{user.hourly_rate || 50}/uur</p>
                        <p className="text-xs text-muted-foreground">Zelf beheerd</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
