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
import { selectEventsForCalendar } from './selectEventsForCalendar';
import { useDayDetailUrl } from './useDayDetailUrl';
import { DayDetailDrawer } from './DayDetailDrawer';
import './fullcalendar.css';

export default function CalendarView() {
  const events = useDerivedSchedule();
  const { open } = useDayDetailUrl();
  // Tasks parameter — Plan 03-07 wires the real expansion. For now: empty array.
  const calendarEvents = selectEventsForCalendar(events, []);

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
