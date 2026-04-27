// src/features/calendar/CalendarView.tsx
// FullCalendar 6.1 wrapper — month + week views, read-only, dateClick → drawer URL state.
// DEFAULT EXPORT for React.lazy in Plan 03-07.
//
// Per CONTEXT D-22..D-26 + UI-SPEC §6.
// Source: [CITED: 03-RESEARCH.md §Example E + §Pitfall 5 (end-exclusive)]

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useDerivedSchedule } from '../gantt/useDerivedSchedule';
import { useExpandedTasks } from '../tasks/useExpandedTasks';
import { selectEventsForCalendar } from './selectEventsForCalendar';
import { useDayDetailUrl } from './useDayDetailUrl';
import { DayDetailDrawer } from './DayDetailDrawer';
import './fullcalendar.css';

export default function CalendarView() {
  const events = useDerivedSchedule();
  // Plan 03-07: centralized expansion (Pitfall 7 — single source for calendar + dashboard).
  // Default range = today..today+60 days; covers visible month + week generously.
  // Trade-off: recurring tasks beyond 60 days do not render until the user navigates
  // and triggers a re-expansion. Phase 4 may extend via FullCalendar `viewDidMount`.
  const tasks = useExpandedTasks();
  const { open } = useDayDetailUrl();
  const calendarEvents = selectEventsForCalendar(events, tasks);

  return (
    <>
      <div className="px-4 py-4 calendar-host">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          buttonText={{ today: 'Today', month: 'Month', week: 'Week' }}
          dayMaxEvents={3}
          events={calendarEvents}
          editable={false}
          selectable={false}
          nowIndicator
          firstDay={0}
          dateClick={(info) => open(info.dateStr)}
          eventClick={(info) => {
            // Click an event → open the drawer for that event's day.
            const dateStr = info.event.startStr.slice(0, 10);
            open(dateStr);
          }}
          height="auto"
        />
      </div>
      <DayDetailDrawer />
    </>
  );
}
