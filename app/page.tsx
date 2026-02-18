'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { useLyzrAgentEvents } from '@/lib/lyzrAgentEvents'
import { AgentActivityPanel } from '@/components/AgentActivityPanel'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiMail, FiUser, FiSend, FiSearch, FiPlus, FiSettings, FiBarChart2, FiEdit3, FiTrash2, FiRefreshCw, FiCheck, FiAlertCircle, FiChevronDown, FiChevronRight, FiClock, FiBookOpen, FiHome, FiFileText } from 'react-icons/fi'

// ── Agent IDs ───────────────────────────────────────────────────────
const OUTREACH_COORDINATOR_ID = '6996242277cd235a2c9b44ee'
const EMAIL_SENDER_ID = '6996245d35f3c2890b9ba1ed'
const RESPONSE_TRACKER_ID = '6996245da552b02becc38df5'

// ── Interfaces ──────────────────────────────────────────────────────
interface PersonalizationBrief {
  company_overview: string
  recent_news: string
  industry_trends: string
  role_analysis: string
  conversation_hooks: string[]
  personalization_summary: string
}

interface EmailDraft {
  subject: string
  body: string
}

interface FollowUp {
  sequence_number: number
  subject: string
  body: string
  send_after_days: number
}

interface OutreachData {
  personalization_brief: PersonalizationBrief
  initial_email: EmailDraft
  follow_ups: FollowUp[]
  outreach_summary: string
}

interface Lead {
  id: string
  name: string
  email: string
  company: string
  role: string
  context: string
  status: 'New' | 'Draft Ready' | 'Outreach Sent' | 'Replied' | 'No Response' | 'Bounced'
  lastActivity: string
  outreachData?: OutreachData
}

interface TrackedLead {
  lead_name: string
  email: string
  status: string
  last_response_date: string
  response_summary: string
  recommended_action: string
}

interface EngagementMetrics {
  total: number
  replied: number
  noResponse: number
  bounced: number
}

interface Settings {
  signature: string
  tone: 'Professional' | 'Friendly' | 'Consultative'
  senderName: string
  followUp1Days: number
  followUp2Days: number
}

type ScreenType = 'dashboard' | 'drafts' | 'tracker' | 'settings'

// ── Sample Data ─────────────────────────────────────────────────────
const SAMPLE_LEADS: Lead[] = [
  {
    id: 'sample-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@techcorp.io',
    company: 'TechCorp Solutions',
    role: 'VP of Engineering',
    context: 'Met at SaaS Connect conference, discussed cloud migration challenges',
    status: 'Draft Ready',
    lastActivity: '2025-01-15T10:30:00Z',
    outreachData: {
      personalization_brief: {
        company_overview: 'TechCorp Solutions is a mid-market SaaS company specializing in enterprise resource planning with 200+ employees and $45M ARR.',
        recent_news: 'Recently announced Series C funding of $30M and expansion into the European market.',
        industry_trends: 'Cloud migration and AI-driven automation are top priorities for ERP companies in 2025.',
        role_analysis: 'As VP of Engineering, Sarah oversees a team of 50+ engineers and drives technical strategy and architecture decisions.',
        conversation_hooks: ['Cloud migration challenges discussed at SaaS Connect', 'Series C funding and scaling engineering team', 'AI integration into ERP workflows'],
        personalization_summary: 'Sarah is a technically savvy leader focused on scaling her engineering organization while modernizing their cloud infrastructure.'
      },
      initial_email: {
        subject: 'Following up from SaaS Connect - Cloud Migration Insights',
        body: 'Hi Sarah,\n\nIt was great connecting with you at SaaS Connect last week. Our conversation about the challenges of migrating legacy ERP systems to cloud-native architectures really resonated with me.\n\nCongratulations on the Series C! As you scale your engineering team, I wanted to share some insights on how other ERP companies have successfully navigated cloud migration while maintaining uptime.\n\nWould you be open to a 20-minute call next week to explore how we might help TechCorp accelerate your cloud journey?\n\nBest regards'
      },
      follow_ups: [
        { sequence_number: 1, subject: 'Re: Cloud Migration Insights for TechCorp', body: 'Hi Sarah,\n\nI wanted to follow up on my previous email. I recently published a case study on how a similar ERP company reduced their migration timeline by 40% - thought it might be relevant to your team.\n\nWould love to share it with you over a quick call.\n\nBest regards', send_after_days: 3 },
        { sequence_number: 2, subject: 'Quick question about your cloud roadmap', body: 'Hi Sarah,\n\nI know you must be incredibly busy with the expansion, so I will keep this brief. Are you still exploring cloud migration solutions for Q2?\n\nEven a 15-minute conversation could be valuable - happy to work around your schedule.\n\nBest regards', send_after_days: 7 }
      ],
      outreach_summary: 'Personalized outreach leveraging SaaS Connect meeting context and Series C funding announcement.'
    }
  },
  {
    id: 'sample-2',
    name: 'Marcus Williams',
    email: 'marcus.w@innovatelabs.com',
    company: 'InnovateLabs',
    role: 'Head of Product',
    context: 'LinkedIn connection, interested in AI-powered analytics',
    status: 'Outreach Sent',
    lastActivity: '2025-01-12T14:15:00Z'
  },
  {
    id: 'sample-3',
    name: 'Emily Rodriguez',
    email: 'erodriguez@globalfinance.com',
    company: 'Global Finance Group',
    role: 'Chief Digital Officer',
    context: 'Referral from James Park, looking to modernize data pipeline',
    status: 'Replied',
    lastActivity: '2025-01-14T09:00:00Z'
  },
  {
    id: 'sample-4',
    name: 'David Kim',
    email: 'dkim@nexushealth.co',
    company: 'Nexus Health',
    role: 'CTO',
    context: 'Webinar attendee on healthcare data compliance',
    status: 'New',
    lastActivity: '2025-01-10T16:45:00Z'
  },
  {
    id: 'sample-5',
    name: 'Aisha Patel',
    email: 'aisha.p@scaledynamics.io',
    company: 'Scale Dynamics',
    role: 'Director of Operations',
    context: 'Cold outreach, company expanding rapidly',
    status: 'No Response',
    lastActivity: '2025-01-08T11:20:00Z'
  }
]

const SAMPLE_TRACKED_LEADS: TrackedLead[] = [
  { lead_name: 'Marcus Williams', email: 'marcus.w@innovatelabs.com', status: 'No Response', last_response_date: 'N/A', response_summary: 'No reply received to initial outreach or follow-up emails.', recommended_action: 'Send a final follow-up with a different value proposition angle.' },
  { lead_name: 'Emily Rodriguez', email: 'erodriguez@globalfinance.com', status: 'Replied', last_response_date: '2025-01-14', response_summary: 'Emily expressed interest in a demo call and asked about compliance features.', recommended_action: 'Schedule a product demo focusing on compliance and data governance features.' },
]

// ── Helpers ──────────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function generateId() {
  return 'lead-' + Math.random().toString(36).substring(2, 11)
}

function getStatusBadgeClasses(status: Lead['status']): string {
  switch (status) {
    case 'New': return 'bg-[hsl(35,15%,85%)] text-[hsl(30,20%,45%)] border-[hsl(35,15%,85%)]'
    case 'Draft Ready': return 'bg-[hsl(210,60%,92%)] text-[hsl(210,60%,35%)] border-[hsl(210,60%,85%)]'
    case 'Outreach Sent': return 'bg-[hsl(27,61%,90%)] text-[hsl(27,61%,26%)] border-[hsl(27,61%,80%)]'
    case 'Replied': return 'bg-[hsl(43,75%,90%)] text-[hsl(43,75%,28%)] border-[hsl(43,75%,70%)]'
    case 'No Response': return 'bg-[hsl(35,15%,88%)] text-[hsl(30,20%,45%)] border-[hsl(35,15%,80%)]'
    case 'Bounced': return 'bg-[hsl(0,84%,95%)] text-[hsl(0,84%,40%)] border-[hsl(0,84%,85%)]'
    default: return 'bg-[hsl(35,15%,85%)] text-[hsl(30,20%,45%)]'
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// ── Agent Info Data ─────────────────────────────────────────────────
const AGENTS = [
  { id: OUTREACH_COORDINATOR_ID, name: 'Outreach Coordinator', purpose: 'Researches leads and drafts personalized email sequences' },
  { id: EMAIL_SENDER_ID, name: 'Email Sender', purpose: 'Sends approved emails via Gmail and creates follow-up drafts' },
  { id: RESPONSE_TRACKER_ID, name: 'Response Tracker', purpose: 'Monitors email responses and classifies engagement status' },
]

// ── Main Page Component ─────────────────────────────────────────────
export default function Page() {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard')

  // Leads
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Draft Editor
  const [editableEmail, setEditableEmail] = useState<EmailDraft>({ subject: '', body: '' })
  const [editableFollowUps, setEditableFollowUps] = useState<FollowUp[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Settings
  const [settings, setSettings] = useState<Settings>({
    signature: '',
    tone: 'Professional',
    senderName: '',
    followUp1Days: 3,
    followUp2Days: 7,
  })

  // Loading / Status
  const [generatingOutreach, setGeneratingOutreach] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [checkingResponses, setCheckingResponses] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Status messages
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Engagement
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({ total: 0, replied: 0, noResponse: 0, bounced: 0 })
  const [trackedLeads, setTrackedLeads] = useState<TrackedLead[]>([])
  const [expandedTrackedRow, setExpandedTrackedRow] = useState<string | null>(null)
  const [overallSummary, setOverallSummary] = useState('')

  // Add Lead Dialog
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLeadForm, setNewLeadForm] = useState({ name: '', email: '', company: '', role: '', context: '' })

  // Confirmation Dialog
  const [showSendConfirm, setShowSendConfirm] = useState(false)

  // Sample Data Toggle
  const [useSampleData, setUseSampleData] = useState(false)

  // Agent Activity
  const [sessionId, setSessionId] = useState<string | null>(null)
  const agentActivity = useLyzrAgentEvents(sessionId)

  // Settings saved indicator
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('leadflow-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Handle sample data toggle
  useEffect(() => {
    if (useSampleData) {
      setLeads(SAMPLE_LEADS)
      setTrackedLeads(SAMPLE_TRACKED_LEADS)
      setEngagementMetrics({ total: 2, replied: 1, noResponse: 1, bounced: 0 })
      setOverallSummary('Out of 2 tracked leads, 1 has replied with interest in a demo. 1 lead has not responded and may need a different approach.')
    } else {
      setLeads([])
      setTrackedLeads([])
      setEngagementMetrics({ total: 0, replied: 0, noResponse: 0, bounced: 0 })
      setOverallSummary('')
      setSelectedLead(null)
    }
  }, [useSampleData])

  // Clear status messages after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // ── Add Lead Handler ──────────────────────────────────────────────
  const handleAddLead = useCallback(() => {
    if (!newLeadForm.name || !newLeadForm.email) return
    const newLead: Lead = {
      id: generateId(),
      name: newLeadForm.name,
      email: newLeadForm.email,
      company: newLeadForm.company,
      role: newLeadForm.role,
      context: newLeadForm.context,
      status: 'New',
      lastActivity: new Date().toISOString(),
    }
    setLeads(prev => [newLead, ...prev])
    setNewLeadForm({ name: '', email: '', company: '', role: '', context: '' })
    setShowAddLead(false)
    setStatusMessage({ type: 'success', text: `Lead "${newLead.name}" added successfully.` })
  }, [newLeadForm])

  // ── Delete Lead Handler ───────────────────────────────────────────
  const handleDeleteLead = useCallback((leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId))
    if (selectedLead?.id === leadId) setSelectedLead(null)
  }, [selectedLead])

  // ── Generate Outreach Handler ─────────────────────────────────────
  const handleGenerateOutreach = useCallback(async (lead: Lead) => {
    setGeneratingOutreach(lead.id)
    setActiveAgentId(OUTREACH_COORDINATOR_ID)
    agentActivity.setProcessing(true)

    const message = `Generate personalized outreach for: Name: ${lead.name}, Email: ${lead.email}, Company: ${lead.company}, Role: ${lead.role}, Context: ${lead.context}`

    try {
      const result = await callAIAgent(message, OUTREACH_COORDINATOR_ID)

      if (result?.session_id) {
        setSessionId(result.session_id)
      }

      if (result?.success) {
        const data = result?.response?.result || {}

        const brief = data?.personalization_brief || {}
        const parsedBrief: PersonalizationBrief = {
          company_overview: brief?.company_overview || '',
          recent_news: brief?.recent_news || '',
          industry_trends: brief?.industry_trends || '',
          role_analysis: brief?.role_analysis || '',
          conversation_hooks: Array.isArray(brief?.conversation_hooks) ? brief.conversation_hooks : [],
          personalization_summary: brief?.personalization_summary || '',
        }

        const email = data?.initial_email || {}
        const parsedEmail: EmailDraft = {
          subject: email?.subject || '',
          body: email?.body || '',
        }

        const rawFollowUps = Array.isArray(data?.follow_ups) ? data.follow_ups : []
        const parsedFollowUps: FollowUp[] = rawFollowUps.map((fu: Record<string, unknown>) => ({
          sequence_number: typeof fu?.sequence_number === 'number' ? fu.sequence_number : 0,
          subject: typeof fu?.subject === 'string' ? fu.subject : '',
          body: typeof fu?.body === 'string' ? fu.body : '',
          send_after_days: typeof fu?.send_after_days === 'number' ? fu.send_after_days : 3,
        }))

        const outreachData: OutreachData = {
          personalization_brief: parsedBrief,
          initial_email: parsedEmail,
          follow_ups: parsedFollowUps,
          outreach_summary: typeof data?.outreach_summary === 'string' ? data.outreach_summary : '',
        }

        const updatedLead: Lead = { ...lead, status: 'Draft Ready', lastActivity: new Date().toISOString(), outreachData }

        setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l))
        setSelectedLead(updatedLead)
        setEditableEmail({ ...parsedEmail })
        setEditableFollowUps([...parsedFollowUps])
        setActiveScreen('drafts')
        setStatusMessage({ type: 'success', text: `Outreach generated for ${lead.name}. Review the draft below.` })
      } else {
        setStatusMessage({ type: 'error', text: result?.error || 'Failed to generate outreach. Please try again.' })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred while generating outreach.' })
    } finally {
      setGeneratingOutreach(null)
      setActiveAgentId(null)
      agentActivity.setProcessing(false)
    }
  }, [agentActivity])

  // ── Send Email Handler ────────────────────────────────────────────
  const handleSendEmail = useCallback(async () => {
    if (!selectedLead) return
    setSendingEmail(true)
    setShowSendConfirm(false)
    setActiveAgentId(EMAIL_SENDER_ID)
    agentActivity.setProcessing(true)

    const followUpsJson = JSON.stringify(editableFollowUps.map(fu => ({
      sequence_number: fu.sequence_number,
      subject: fu.subject,
      body: fu.body,
      send_after_days: fu.send_after_days
    })))

    const message = `Send this email to ${selectedLead.email}. Subject: ${editableEmail.subject}. Body: ${editableEmail.body}. Also create follow-up drafts: ${followUpsJson}`

    try {
      const result = await callAIAgent(message, EMAIL_SENDER_ID)

      if (result?.session_id) {
        setSessionId(result.session_id)
      }

      if (result?.success) {
        const data = result?.response?.result || {}
        const sentEmail = data?.sent_email || {}
        const followUpDrafts = Array.isArray(data?.follow_up_drafts) ? data.follow_up_drafts : []
        const summary = data?.summary || ''

        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'Outreach Sent' as const, lastActivity: new Date().toISOString() } : l))

        const successParts = [`Email sent to ${sentEmail?.recipient || selectedLead.email}.`]
        if (followUpDrafts.length > 0) {
          successParts.push(`${followUpDrafts.length} follow-up draft(s) created.`)
        }
        if (summary) {
          successParts.push(summary)
        }

        setStatusMessage({ type: 'success', text: successParts.join(' ') })
        setSelectedLead(null)
        setActiveScreen('dashboard')
      } else {
        setStatusMessage({ type: 'error', text: result?.error || 'Failed to send email. Please try again.' })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred while sending the email.' })
    } finally {
      setSendingEmail(false)
      setActiveAgentId(null)
      agentActivity.setProcessing(false)
    }
  }, [selectedLead, editableEmail, editableFollowUps, agentActivity])

  // ── Check Responses Handler ───────────────────────────────────────
  const handleCheckResponses = useCallback(async () => {
    const sentLeads = leads.filter(l => l.status === 'Outreach Sent' || l.status === 'Replied' || l.status === 'No Response' || l.status === 'Bounced')
    if (sentLeads.length === 0) {
      setStatusMessage({ type: 'error', text: 'No outreach has been sent yet. Send emails first before checking responses.' })
      return
    }

    setCheckingResponses(true)
    setActiveAgentId(RESPONSE_TRACKER_ID)
    agentActivity.setProcessing(true)

    const leadsJson = JSON.stringify(sentLeads.map(l => ({ name: l.name, email: l.email })))
    const message = `Check email responses and engagement status for these outreach leads: ${leadsJson}`

    try {
      const result = await callAIAgent(message, RESPONSE_TRACKER_ID)

      if (result?.session_id) {
        setSessionId(result.session_id)
      }

      if (result?.success) {
        const data = result?.response?.result || {}

        const rawTracked = Array.isArray(data?.tracked_leads) ? data.tracked_leads : []
        const parsedTracked: TrackedLead[] = rawTracked.map((t: Record<string, unknown>) => ({
          lead_name: typeof t?.lead_name === 'string' ? t.lead_name : '',
          email: typeof t?.email === 'string' ? t.email : '',
          status: typeof t?.status === 'string' ? t.status : 'Unknown',
          last_response_date: typeof t?.last_response_date === 'string' ? t.last_response_date : 'N/A',
          response_summary: typeof t?.response_summary === 'string' ? t.response_summary : '',
          recommended_action: typeof t?.recommended_action === 'string' ? t.recommended_action : '',
        }))

        setTrackedLeads(parsedTracked)

        const engSum = data?.engagement_summary || {}
        setEngagementMetrics({
          total: typeof engSum?.total_tracked === 'number' ? engSum.total_tracked : parsedTracked.length,
          replied: typeof engSum?.replied === 'number' ? engSum.replied : 0,
          noResponse: typeof engSum?.no_response === 'number' ? engSum.no_response : 0,
          bounced: typeof engSum?.bounced === 'number' ? engSum.bounced : 0,
        })

        setOverallSummary(typeof data?.overall_summary === 'string' ? data.overall_summary : '')

        // Update lead statuses based on tracker response
        parsedTracked.forEach(tracked => {
          const statusLower = (tracked.status || '').toLowerCase()
          let newStatus: Lead['status'] = 'Outreach Sent'
          if (statusLower.includes('replied') || statusLower.includes('response')) newStatus = 'Replied'
          else if (statusLower.includes('no response') || statusLower.includes('no_response')) newStatus = 'No Response'
          else if (statusLower.includes('bounced') || statusLower.includes('bounce')) newStatus = 'Bounced'

          setLeads(prev => prev.map(l =>
            l.email.toLowerCase() === tracked.email.toLowerCase() ? { ...l, status: newStatus, lastActivity: new Date().toISOString() } : l
          ))
        })

        setStatusMessage({ type: 'success', text: `Checked responses for ${parsedTracked.length} lead(s).` })
      } else {
        setStatusMessage({ type: 'error', text: result?.error || 'Failed to check responses. Please try again.' })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred while checking responses.' })
    } finally {
      setCheckingResponses(false)
      setActiveAgentId(null)
      agentActivity.setProcessing(false)
    }
  }, [leads, agentActivity])

  // ── Save Settings ─────────────────────────────────────────────────
  const handleSaveSettings = useCallback(() => {
    try {
      localStorage.setItem('leadflow-settings', JSON.stringify(settings))
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch {
      // Ignore
    }
  }, [settings])

  // ── Filtered Leads ────────────────────────────────────────────────
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const query = searchQuery.toLowerCase()
    const matchesSearch = !query || lead.name.toLowerCase().includes(query) || lead.company.toLowerCase().includes(query) || lead.email.toLowerCase().includes(query)
    return matchesStatus && matchesSearch
  })

  // ── Navigation item click ─────────────────────────────────────────
  const navigateTo = useCallback((screen: ScreenType) => {
    setActiveScreen(screen)
    setStatusMessage(null)
  }, [])

  // ── Sidebar Nav Item Component ────────────────────────────────────
  function NavItem({ screen, icon, label }: { screen: ScreenType; icon: React.ReactNode; label: string }) {
    const isActive = activeScreen === screen
    return (
      <button onClick={() => navigateTo(screen)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] shadow-md' : 'text-[hsl(30,22%,14%)] hover:bg-[hsl(35,20%,85%)]'}`}>
        {icon}
        <span>{label}</span>
      </button>
    )
  }

  // ── Metric Card Component ─────────────────────────────────────────
  function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
      <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold font-serif text-[hsl(30,22%,14%)]">{value}</p>
            <p className="text-xs text-[hsl(30,20%,45%)]">{label}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[hsl(35,29%,95%)] text-[hsl(30,22%,14%)] flex font-sans">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="w-[260px] min-h-screen bg-[hsl(35,25%,90%)] border-r border-[hsl(35,20%,85%)] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[hsl(35,20%,85%)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[hsl(27,61%,26%)] flex items-center justify-center">
              <FiSend className="w-4 h-4 text-[hsl(35,29%,98%)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-serif text-[hsl(30,22%,14%)] tracking-wide">LeadFlow AI</h1>
              <p className="text-[10px] text-[hsl(30,20%,45%)] tracking-widest uppercase">Sales Outreach</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem screen="dashboard" icon={<FiHome className="w-4 h-4" />} label="Lead Dashboard" />
          <NavItem screen="drafts" icon={<FiFileText className="w-4 h-4" />} label="Draft Review" />
          <NavItem screen="tracker" icon={<FiBarChart2 className="w-4 h-4" />} label="Engagement Tracker" />
          <NavItem screen="settings" icon={<FiSettings className="w-4 h-4" />} label="Settings" />
        </nav>

        {/* Agent Info */}
        <div className="px-4 py-4 border-t border-[hsl(35,20%,85%)]">
          <p className="text-[10px] uppercase tracking-widest text-[hsl(30,20%,45%)] mb-3 font-semibold">Agents</p>
          <div className="space-y-2">
            {AGENTS.map(agent => (
              <div key={agent.id} className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activeAgentId === agent.id ? 'bg-[hsl(43,75%,38%)] animate-pulse' : 'bg-[hsl(35,15%,75%)]'}`} />
                <div>
                  <p className="text-xs font-medium text-[hsl(30,22%,14%)]">{agent.name}</p>
                  <p className="text-[10px] text-[hsl(30,20%,45%)] leading-tight">{agent.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-[hsl(35,29%,95%)]/95 backdrop-blur-sm border-b border-[hsl(35,20%,85%)] px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-serif text-[hsl(30,22%,14%)]">
              {activeScreen === 'dashboard' && 'Lead Dashboard'}
              {activeScreen === 'drafts' && 'Draft Review'}
              {activeScreen === 'tracker' && 'Engagement Tracker'}
              {activeScreen === 'settings' && 'Settings'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-xs text-[hsl(30,20%,45%)]">Sample Data</Label>
              <Switch id="sample-toggle" checked={useSampleData} onCheckedChange={setUseSampleData} />
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mx-8 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${statusMessage.type === 'success' ? 'bg-[hsl(142,55%,92%)] text-[hsl(142,55%,25%)] border border-[hsl(142,55%,80%)]' : 'bg-[hsl(0,84%,95%)] text-[hsl(0,84%,40%)] border border-[hsl(0,84%,85%)]'}`}>
            {statusMessage.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : <FiAlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="p-8">
          {/* ── DASHBOARD SCREEN ──────────────────────────────────── */}
          {activeScreen === 'dashboard' && (
            <div>
              {/* Header Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 flex-1 max-w-xl">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(30,20%,45%)]" />
                    <Input placeholder="Search leads by name, company, or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)] placeholder:text-[hsl(30,20%,65%)]" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)]">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Draft Ready">Draft Ready</SelectItem>
                      <SelectItem value="Outreach Sent">Outreach Sent</SelectItem>
                      <SelectItem value="Replied">Replied</SelectItem>
                      <SelectItem value="No Response">No Response</SelectItem>
                      <SelectItem value="Bounced">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
                  <DialogTrigger asChild>
                    <Button className="bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)] gap-2">
                      <FiPlus className="w-4 h-4" />
                      Add Lead
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)]">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-lg">Add New Lead</DialogTitle>
                      <DialogDescription className="text-[hsl(30,20%,45%)]">Enter the lead details to add them to your pipeline.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label htmlFor="lead-name" className="text-sm font-medium">Name *</Label>
                        <Input id="lead-name" placeholder="e.g. Sarah Chen" value={newLeadForm.name} onChange={(e) => setNewLeadForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                      </div>
                      <div>
                        <Label htmlFor="lead-email" className="text-sm font-medium">Email *</Label>
                        <Input id="lead-email" type="email" placeholder="e.g. sarah@company.com" value={newLeadForm.email} onChange={(e) => setNewLeadForm(prev => ({ ...prev, email: e.target.value }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                      </div>
                      <div>
                        <Label htmlFor="lead-company" className="text-sm font-medium">Company</Label>
                        <Input id="lead-company" placeholder="e.g. TechCorp Solutions" value={newLeadForm.company} onChange={(e) => setNewLeadForm(prev => ({ ...prev, company: e.target.value }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                      </div>
                      <div>
                        <Label htmlFor="lead-role" className="text-sm font-medium">Role</Label>
                        <Input id="lead-role" placeholder="e.g. VP of Engineering" value={newLeadForm.role} onChange={(e) => setNewLeadForm(prev => ({ ...prev, role: e.target.value }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                      </div>
                      <div>
                        <Label htmlFor="lead-context" className="text-sm font-medium">Custom Context</Label>
                        <Textarea id="lead-context" placeholder="e.g. Met at SaaS Connect conference, discussed cloud migration challenges" value={newLeadForm.context} onChange={(e) => setNewLeadForm(prev => ({ ...prev, context: e.target.value }))} rows={3} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddLead(false)} className="border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)]">Cancel</Button>
                      <Button onClick={handleAddLead} disabled={!newLeadForm.name || !newLeadForm.email} className="bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)]">Save Lead</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Lead Cards Grid */}
              {filteredLeads.length === 0 ? (
                <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                  <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[hsl(35,15%,85%)] flex items-center justify-center mb-4">
                      <FiUser className="w-7 h-7 text-[hsl(30,20%,45%)]" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[hsl(30,22%,14%)] mb-2">No leads yet</h3>
                    <p className="text-sm text-[hsl(30,20%,45%)] max-w-sm">Add your first lead to get started with personalized outreach campaigns powered by AI.</p>
                    <Button onClick={() => setShowAddLead(true)} className="mt-6 bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)] gap-2">
                      <FiPlus className="w-4 h-4" />
                      Add Your First Lead
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredLeads.map(lead => (
                    <Card key={lead.id} className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm hover:shadow-md transition-shadow duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif font-bold text-base text-[hsl(30,22%,14%)] truncate">{lead.name}</h3>
                            <p className="text-sm text-[hsl(30,20%,45%)] truncate">{lead.role}{lead.role && lead.company ? ' at ' : ''}{lead.company}</p>
                          </div>
                          <Badge className={`ml-2 text-[10px] font-medium px-2 py-0.5 ${getStatusBadgeClasses(lead.status)}`}>{lead.status}</Badge>
                        </div>
                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center gap-2 text-sm text-[hsl(30,20%,45%)]">
                            <FiMail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          {lead.context && (
                            <div className="flex items-start gap-2 text-sm text-[hsl(30,20%,45%)]">
                              <FiBookOpen className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{lead.context}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-[hsl(30,20%,55%)]">
                            <FiClock className="w-3 h-3 flex-shrink-0" />
                            <span>{formatDate(lead.lastActivity)} {formatTime(lead.lastActivity)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button onClick={() => handleGenerateOutreach(lead)} disabled={generatingOutreach === lead.id} className="flex-1 bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)] text-xs h-9 gap-1.5">
                            {generatingOutreach === lead.id ? (
                              <>
                                <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FiEdit3 className="w-3.5 h-3.5" />
                                Generate Outreach
                              </>
                            )}
                          </Button>
                          {lead.status === 'Draft Ready' && lead.outreachData && (
                            <Button variant="outline" onClick={() => { setSelectedLead(lead); setEditableEmail({ ...lead.outreachData!.initial_email }); setEditableFollowUps([...lead.outreachData!.follow_ups]); setActiveScreen('drafts') }} className="text-xs h-9 border-[hsl(27,61%,26%)] text-[hsl(27,61%,26%)] hover:bg-[hsl(27,61%,90%)]">
                              Review Draft
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteLead(lead.id)} className="h-9 w-9 text-[hsl(30,20%,45%)] hover:text-[hsl(0,84%,60%)] hover:bg-[hsl(0,84%,95%)]">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DRAFT REVIEW SCREEN ───────────────────────────────── */}
          {activeScreen === 'drafts' && (
            <div>
              {!selectedLead || !selectedLead.outreachData ? (
                <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                  <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[hsl(35,15%,85%)] flex items-center justify-center mb-4">
                      <FiFileText className="w-7 h-7 text-[hsl(30,20%,45%)]" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[hsl(30,22%,14%)] mb-2">No draft selected</h3>
                    <p className="text-sm text-[hsl(30,20%,45%)] max-w-sm">Generate outreach for a lead from the Dashboard to review and edit the draft here.</p>
                    <Button onClick={() => setActiveScreen('dashboard')} className="mt-6 bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)] gap-2">
                      <FiHome className="w-4 h-4" />
                      Go to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {/* Lead Info Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-serif font-bold text-lg text-[hsl(30,22%,14%)]">{selectedLead.name}</h3>
                        <Badge className={`text-[10px] ${getStatusBadgeClasses(selectedLead.status)}`}>{selectedLead.status}</Badge>
                      </div>
                      <p className="text-sm text-[hsl(30,20%,45%)]">{selectedLead.role} at {selectedLead.company} &middot; {selectedLead.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => handleGenerateOutreach(selectedLead)} disabled={generatingOutreach === selectedLead.id} className="text-xs border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)] hover:bg-[hsl(35,20%,88%)] gap-1.5">
                        {generatingOutreach === selectedLead.id ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiRefreshCw className="w-3.5 h-3.5" />}
                        Regenerate
                      </Button>
                      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
                        <DialogTrigger asChild>
                          <Button disabled={sendingEmail || !editableEmail.subject || !editableEmail.body} className="bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)] gap-1.5 text-xs">
                            {sendingEmail ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiSend className="w-3.5 h-3.5" />}
                            {sendingEmail ? 'Sending...' : 'Approve & Send'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)]">
                          <DialogHeader>
                            <DialogTitle className="font-serif">Confirm Send</DialogTitle>
                            <DialogDescription className="text-[hsl(30,20%,45%)]">
                              This will send the email to <strong className="text-[hsl(30,22%,14%)]">{selectedLead.email}</strong> and create {editableFollowUps.length} follow-up draft(s) in Gmail. This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-2 space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">Subject:</span> {editableEmail.subject}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Follow-ups:</span> {editableFollowUps.length} email(s) scheduled
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowSendConfirm(false)} className="border-[hsl(35,20%,85%)]">Cancel</Button>
                            <Button onClick={handleSendEmail} className="bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)] gap-1.5">
                              <FiSend className="w-3.5 h-3.5" />
                              Send Now
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Split Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Left Panel - Personalization Brief */}
                    <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-serif text-base flex items-center gap-2">
                          <FiBookOpen className="w-4 h-4 text-[hsl(43,75%,38%)]" />
                          Personalization Brief
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-4">
                            {/* Company Overview */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Company Overview</h4>
                              <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed">{renderMarkdown(selectedLead.outreachData?.personalization_brief?.company_overview || '')}</div>
                            </div>
                            <Separator className="bg-[hsl(35,20%,85%)]" />
                            {/* Recent News */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Recent News</h4>
                              <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed">{renderMarkdown(selectedLead.outreachData?.personalization_brief?.recent_news || '')}</div>
                            </div>
                            <Separator className="bg-[hsl(35,20%,85%)]" />
                            {/* Industry Trends */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Industry Trends</h4>
                              <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed">{renderMarkdown(selectedLead.outreachData?.personalization_brief?.industry_trends || '')}</div>
                            </div>
                            <Separator className="bg-[hsl(35,20%,85%)]" />
                            {/* Role Analysis */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Role Analysis</h4>
                              <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed">{renderMarkdown(selectedLead.outreachData?.personalization_brief?.role_analysis || '')}</div>
                            </div>
                            <Separator className="bg-[hsl(35,20%,85%)]" />
                            {/* Conversation Hooks */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Conversation Hooks</h4>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(selectedLead.outreachData?.personalization_brief?.conversation_hooks) && selectedLead.outreachData.personalization_brief.conversation_hooks.map((hook, i) => (
                                  <Badge key={i} variant="secondary" className="bg-[hsl(43,75%,90%)] text-[hsl(43,75%,25%)] border-[hsl(43,75%,70%)] text-xs font-normal">{hook}</Badge>
                                ))}
                              </div>
                            </div>
                            <Separator className="bg-[hsl(35,20%,85%)]" />
                            {/* Personalization Summary */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Summary</h4>
                              <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed italic">{renderMarkdown(selectedLead.outreachData?.personalization_brief?.personalization_summary || '')}</div>
                            </div>
                            {/* Outreach Summary */}
                            {selectedLead.outreachData?.outreach_summary && (
                              <>
                                <Separator className="bg-[hsl(35,20%,85%)]" />
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Outreach Summary</h4>
                                  <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed">{renderMarkdown(selectedLead.outreachData.outreach_summary)}</div>
                                </div>
                              </>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Right Panel - Email Editor */}
                    <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="font-serif text-base flex items-center gap-2">
                            <FiMail className="w-4 h-4 text-[hsl(27,61%,26%)]" />
                            Initial Email
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="preview-toggle" className="text-xs text-[hsl(30,20%,45%)]">Preview</Label>
                            <Switch id="preview-toggle" checked={showPreview} onCheckedChange={setShowPreview} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="email-subject" className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)]">Subject Line</Label>
                              {showPreview ? (
                                <p className="mt-1 text-sm font-medium text-[hsl(30,22%,14%)]">{editableEmail.subject}</p>
                              ) : (
                                <Input id="email-subject" value={editableEmail.subject} onChange={(e) => setEditableEmail(prev => ({ ...prev, subject: e.target.value }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)]" />
                              )}
                            </div>
                            <Separator className="bg-[hsl(35,20%,85%)]" />
                            <div>
                              <Label htmlFor="email-body" className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)]">Email Body</Label>
                              {showPreview ? (
                                <div className="mt-2 text-sm text-[hsl(30,22%,14%)] font-serif leading-relaxed whitespace-pre-wrap p-4 rounded-lg bg-[hsl(35,29%,95%)] border border-[hsl(35,20%,85%)]">{editableEmail.body}</div>
                              ) : (
                                <Textarea id="email-body" value={editableEmail.body} onChange={(e) => setEditableEmail(prev => ({ ...prev, body: e.target.value }))} rows={14} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)] text-[hsl(30,22%,14%)] font-serif leading-relaxed" />
                              )}
                            </div>
                            {settings.signature && (
                              <div>
                                <p className="text-xs text-[hsl(30,20%,45%)] mb-1">Signature</p>
                                <p className="text-sm text-[hsl(30,20%,45%)] italic whitespace-pre-wrap">{settings.signature}</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Follow-Up Timeline */}
                  {editableFollowUps.length > 0 && (
                    <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-serif text-base flex items-center gap-2">
                          <FiClock className="w-4 h-4 text-[hsl(43,75%,38%)]" />
                          Follow-Up Sequence
                        </CardTitle>
                        <CardDescription className="text-[hsl(30,20%,45%)]">{editableFollowUps.length} follow-up email(s) scheduled after the initial send</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-0">
                          {editableFollowUps.map((fu, index) => (
                            <div key={index} className="relative">
                              {/* Timeline connector */}
                              {index < editableFollowUps.length - 1 && (
                                <div className="absolute left-5 top-12 w-0.5 h-[calc(100%-1rem)] bg-[hsl(35,20%,80%)]" />
                              )}
                              <div className="flex items-start gap-4 pb-6">
                                {/* Timeline dot */}
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(27,61%,90%)] border-2 border-[hsl(27,61%,26%)] flex items-center justify-center z-10">
                                  <span className="text-xs font-bold text-[hsl(27,61%,26%)]">{fu.sequence_number || index + 1}</span>
                                </div>
                                {/* Content */}
                                <div className="flex-1 bg-[hsl(35,29%,95%)] rounded-lg border border-[hsl(35,20%,85%)] p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="bg-[hsl(27,61%,90%)] text-[hsl(27,61%,26%)] text-[10px]">
                                        Follow-up {fu.sequence_number || index + 1}
                                      </Badge>
                                      <div className="flex items-center gap-1.5">
                                        <Label className="text-[10px] text-[hsl(30,20%,45%)]">Send after</Label>
                                        <Input type="number" value={fu.send_after_days} onChange={(e) => { const val = parseInt(e.target.value) || 0; setEditableFollowUps(prev => prev.map((f, i) => i === index ? { ...f, send_after_days: val } : f)) }} className="w-16 h-7 text-xs bg-white border-[hsl(35,20%,85%)] text-center" min={1} />
                                        <span className="text-[10px] text-[hsl(30,20%,45%)]">days</span>
                                      </div>
                                    </div>
                                  </div>
                                  {showPreview ? (
                                    <div>
                                      <p className="text-sm font-medium text-[hsl(30,22%,14%)] mb-2">{fu.subject}</p>
                                      <div className="text-sm text-[hsl(30,22%,14%)] font-serif leading-relaxed whitespace-pre-wrap">{fu.body}</div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div>
                                        <Label className="text-[10px] text-[hsl(30,20%,45%)]">Subject</Label>
                                        <Input value={fu.subject} onChange={(e) => setEditableFollowUps(prev => prev.map((f, i) => i === index ? { ...f, subject: e.target.value } : f))} className="mt-0.5 bg-white border-[hsl(35,20%,85%)] text-sm" />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] text-[hsl(30,20%,45%)]">Body</Label>
                                        <Textarea value={fu.body} onChange={(e) => setEditableFollowUps(prev => prev.map((f, i) => i === index ? { ...f, body: e.target.value } : f))} rows={5} className="mt-0.5 bg-white border-[hsl(35,20%,85%)] text-sm font-serif leading-relaxed" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ENGAGEMENT TRACKER SCREEN ──────────────────────────── */}
          {activeScreen === 'tracker' && (
            <div>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard label="Total Sent" value={engagementMetrics.total} icon={<FiSend className="w-5 h-5 text-[hsl(27,61%,26%)]" />} color="bg-[hsl(27,61%,90%)]" />
                <MetricCard label="Replied" value={engagementMetrics.replied} icon={<FiCheck className="w-5 h-5 text-[hsl(43,75%,38%)]" />} color="bg-[hsl(43,75%,90%)]" />
                <MetricCard label="Pending" value={engagementMetrics.noResponse} icon={<FiClock className="w-5 h-5 text-[hsl(30,20%,45%)]" />} color="bg-[hsl(35,15%,88%)]" />
                <MetricCard label="Bounced" value={engagementMetrics.bounced} icon={<FiAlertCircle className="w-5 h-5 text-[hsl(0,84%,60%)]" />} color="bg-[hsl(0,84%,95%)]" />
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between mb-4">
                {overallSummary && (
                  <div className="flex-1 mr-4">
                    <p className="text-sm text-[hsl(30,20%,45%)] italic">{overallSummary}</p>
                  </div>
                )}
                <Button onClick={handleCheckResponses} disabled={checkingResponses} className="bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)] gap-1.5 flex-shrink-0">
                  {checkingResponses ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <FiSearch className="w-4 h-4" />
                      Check Responses
                    </>
                  )}
                </Button>
              </div>

              {/* Engagement Table */}
              {checkingResponses ? (
                <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full bg-[hsl(35,15%,85%)]" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3 bg-[hsl(35,15%,85%)]" />
                          <Skeleton className="h-3 w-1/2 bg-[hsl(35,15%,85%)]" />
                        </div>
                        <Skeleton className="h-6 w-20 bg-[hsl(35,15%,85%)]" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : trackedLeads.length === 0 ? (
                <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                  <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[hsl(35,15%,85%)] flex items-center justify-center mb-4">
                      <FiBarChart2 className="w-7 h-7 text-[hsl(30,20%,45%)]" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[hsl(30,22%,14%)] mb-2">No engagement data yet</h3>
                    <p className="text-sm text-[hsl(30,20%,45%)] max-w-sm">Send outreach emails first, then click &quot;Check Responses&quot; to track engagement and classify lead responses.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[hsl(35,20%,85%)] hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider text-[hsl(30,20%,45%)] font-semibold w-8"></TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-[hsl(30,20%,45%)] font-semibold">Lead Name</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-[hsl(30,20%,45%)] font-semibold">Email</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-[hsl(30,20%,45%)] font-semibold">Status</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-[hsl(30,20%,45%)] font-semibold">Last Response</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-[hsl(30,20%,45%)] font-semibold">Recommended Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackedLeads.map((tracked, idx) => {
                        const rowKey = `${tracked.email}-${idx}`
                        const isExpanded = expandedTrackedRow === rowKey
                        return (
                          <React.Fragment key={rowKey}>
                            <TableRow onClick={() => setExpandedTrackedRow(isExpanded ? null : rowKey)} className="cursor-pointer border-b border-[hsl(35,20%,88%)] hover:bg-[hsl(35,20%,88%)] transition-colors">
                              <TableCell className="w-8 py-3">
                                {isExpanded ? <FiChevronDown className="w-3.5 h-3.5 text-[hsl(30,20%,45%)]" /> : <FiChevronRight className="w-3.5 h-3.5 text-[hsl(30,20%,45%)]" />}
                              </TableCell>
                              <TableCell className="py-3 text-sm font-medium text-[hsl(30,22%,14%)]">{tracked.lead_name}</TableCell>
                              <TableCell className="py-3 text-sm text-[hsl(30,20%,45%)]">{tracked.email}</TableCell>
                              <TableCell className="py-3">
                                <Badge className={`text-[10px] font-medium ${(tracked.status || '').toLowerCase().includes('replied') ? 'bg-[hsl(43,75%,90%)] text-[hsl(43,75%,28%)] border-[hsl(43,75%,70%)]' : (tracked.status || '').toLowerCase().includes('bounce') ? 'bg-[hsl(0,84%,95%)] text-[hsl(0,84%,40%)] border-[hsl(0,84%,85%)]' : 'bg-[hsl(35,15%,88%)] text-[hsl(30,20%,45%)] border-[hsl(35,15%,80%)]'}`}>{tracked.status}</Badge>
                              </TableCell>
                              <TableCell className="py-3 text-sm text-[hsl(30,20%,45%)]">{formatDate(tracked.last_response_date)}</TableCell>
                              <TableCell className="py-3 text-sm text-[hsl(30,22%,14%)] max-w-[200px] truncate">{tracked.recommended_action}</TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="py-4 px-8 bg-[hsl(35,29%,95%)]">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Response Summary</h4>
                                      <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed">{renderMarkdown(tracked.response_summary)}</div>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(30,20%,45%)] mb-1.5">Recommended Action</h4>
                                      <div className="text-sm text-[hsl(30,22%,14%)] leading-relaxed">{renderMarkdown(tracked.recommended_action)}</div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* ── SETTINGS SCREEN ───────────────────────────────────── */}
          {activeScreen === 'settings' && (
            <div className="max-w-2xl space-y-6">
              {/* Email Defaults */}
              <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-base flex items-center gap-2">
                    <FiMail className="w-4 h-4 text-[hsl(27,61%,26%)]" />
                    Email Defaults
                  </CardTitle>
                  <CardDescription className="text-[hsl(30,20%,45%)]">Configure your default email settings for outreach campaigns.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="sender-name" className="text-sm font-medium">Sender Name</Label>
                    <Input id="sender-name" placeholder="e.g. John Smith" value={settings.senderName} onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                  </div>
                  <div>
                    <Label htmlFor="tone-select" className="text-sm font-medium">Default Tone</Label>
                    <Select value={settings.tone} onValueChange={(val) => setSettings(prev => ({ ...prev, tone: val as Settings['tone'] }))}>
                      <SelectTrigger id="tone-select" className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)]">
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Friendly">Friendly</SelectItem>
                        <SelectItem value="Consultative">Consultative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="signature" className="text-sm font-medium">Email Signature</Label>
                    <Textarea id="signature" placeholder="Your email signature..." value={settings.signature} onChange={(e) => setSettings(prev => ({ ...prev, signature: e.target.value }))} rows={4} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                  </div>
                </CardContent>
              </Card>

              {/* Follow-Up Templates */}
              <Card className="bg-[hsl(35,29%,92%)] border-[hsl(35,20%,85%)] shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-base flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-[hsl(43,75%,38%)]" />
                    Follow-Up Cadence
                  </CardTitle>
                  <CardDescription className="text-[hsl(30,20%,45%)]">Set the default timing for follow-up emails in your outreach sequences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fu1-days" className="text-sm font-medium">Follow-Up 1 (days after send)</Label>
                      <Input id="fu1-days" type="number" min={1} max={30} value={settings.followUp1Days} onChange={(e) => setSettings(prev => ({ ...prev, followUp1Days: parseInt(e.target.value) || 3 }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                    </div>
                    <div>
                      <Label htmlFor="fu2-days" className="text-sm font-medium">Follow-Up 2 (days after send)</Label>
                      <Input id="fu2-days" type="number" min={1} max={60} value={settings.followUp2Days} onChange={(e) => setSettings(prev => ({ ...prev, followUp2Days: parseInt(e.target.value) || 7 }))} className="mt-1 bg-[hsl(35,29%,95%)] border-[hsl(35,20%,85%)]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[hsl(30,20%,45%)]">
                    <FiClock className="w-3.5 h-3.5" />
                    <span>Follow-up 1 will be sent {settings.followUp1Days} day(s) after the initial email. Follow-up 2 will be sent {settings.followUp2Days} day(s) after.</span>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveSettings} className="bg-[hsl(27,61%,26%)] text-[hsl(35,29%,98%)] hover:bg-[hsl(27,61%,22%)]">
                  Save Settings
                </Button>
                {settingsSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-[hsl(142,55%,35%)]">
                    <FiCheck className="w-4 h-4" />
                    Settings saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Agent Activity Panel ─────────────────────────────────── */}
      <AgentActivityPanel
        isConnected={agentActivity.isConnected}
        events={agentActivity.events}
        thinkingEvents={agentActivity.thinkingEvents}
        lastThinkingMessage={agentActivity.lastThinkingMessage}
        activeAgentId={agentActivity.activeAgentId}
        activeAgentName={agentActivity.activeAgentName}
        isProcessing={agentActivity.isProcessing}
      />
    </div>
  )
}
