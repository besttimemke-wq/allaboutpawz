"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Calendar as CalIcon, Plus, Clock } from "@phosphor-icons/react"

type Booking = {
  id: string; ownerName: string; dogName: string; service: string
  date: string; time: string; status: string; groomerId: string | null
}

const STATUS_COLORS: Record<string, string> = {
  PAYMENT_PENDING: "#f59e0b",
  CONFIRMED: "#10b981",
  CHECKED_IN: "#0ea5e9",
  IN_SERVICE: "#6366f1",
  COMPLETED: "#374151",
  CANCELLED: "#9ca3af",
  NO_SHOW: "#ef4444",
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"day" | "week" | "month">("day")
  const calRef = useRef<FullCalendar>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/cms/bookings").then(r => r.json()).then(d => {
      if (alive) { setBookings(d || []); setLoading(false) }
    }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const events = bookings.map(b => {
    const [h, m] = b.time?.replace(/(AM|PM)/i, "").trim().split(/[:\s]/).map(Number) || [9, 0]
    const isPM = /PM/i.test(b.time || "")
    const hour = isPM && h !== 12 ? h + 12 : h === 12 && !isPM ? 0 : h
    const startDate = new Date(`${b.date}T00:00:00`)
    startDate.setHours(hour || 9, m || 0)
    const endDate = new Date(startDate)
    endDate.setHours(startDate.getHours() + 2)

    return {
      id: b.id,
      title: `${b.dogName} — ${b.service}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      backgroundColor: STATUS_COLORS[b.status] || "#6366f1",
      borderColor: STATUS_COLORS[b.status] || "#6366f1",
      extendedProps: { booking: b },
    }
  })

  const changeView = (v: "dayGridMonth" | "timeGridWeek" | "timeGridDay") => {
    const api = calRef.current?.getApi()
    if (api) {
      api.changeView(v)
      setView(v === "timeGridDay" ? "day" : v === "timeGridWeek" ? "week" : "month")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Operations</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeView("timeGridDay")} className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${view === "day" ? "bg-black text-white" : "border border-black/10 text-zinc-600 hover:bg-zinc-50"}`}>Day</button>
          <button onClick={() => changeView("timeGridWeek")} className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${view === "week" ? "bg-black text-white" : "border border-black/10 text-zinc-600 hover:bg-zinc-50"}`}>Week</button>
          <button onClick={() => changeView("dayGridMonth")} className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${view === "month" ? "bg-black text-white" : "border border-black/10 text-zinc-600 hover:bg-zinc-50"}`}>Month</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 bg-white p-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{status.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        {loading ? (
          <div className="h-96 animate-pulse bg-zinc-100 rounded" />
        ) : (
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            height="auto"
            slotMinTime="08:00:00"
            slotMaxTime="19:00:00"
            events={events}
            eventClick={(info) => {
              window.location.href = `/admin/bookings/${info.event.id}`
            }}
            eventContent={(arg) => (
              <div className="cursor-pointer overflow-hidden p-1 text-white">
                <p className="truncate text-[10px] font-bold">{arg.event.title}</p>
                <p className="truncate text-[9px] opacity-80">
                  {arg.event.extendedProps.booking?.ownerName} · {arg.event.extendedProps.booking?.status}
                </p>
              </div>
            )}
            nowIndicator
            businessHours={{
              daysOfWeek: [2, 3, 4, 5, 6, 0],
              startTime: "09:00",
              endTime: "18:00",
            }}
          />
        )}
      </div>
    </div>
  )
}
