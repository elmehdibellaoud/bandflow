import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

/**
 * Updated DateTimePicker Component.
 * - Month & Year dropdown lists in the header for easy year jumps.
 * - Grid-based calendar selector for dates (past dates disabled).
 * - Restores the native HTML5 time input (type="time") for time selection.
 */
export default function DateTimePicker({ value, onChange }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeString, setTimeString] = useState('12:00'); // stores "HH:MM" format

  // Sync state with incoming value
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setTimeString(`${hh}:${mm}`);
        
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    } else {
      setSelectedDate(null);
      setTimeString('12:00');
    }
  }, [value]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Year options list: current year to 10 years out
  const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() + i);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentYear === now.getFullYear() && currentMonth === now.getMonth()) {
      return; // Block past months
    }
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day) => {
    const newDate = new Date(currentYear, currentMonth, day);
    if (newDate < today) return; // Block past days
    setSelectedDate(newDate);
    
    const [h, m] = timeString.split(':').map(Number);
    updateValue(newDate, h, m);
  };

  const handleTimeChange = (newTime) => {
    setTimeString(newTime || '12:00');
    const [h, m] = (newTime || '12:00').split(':').map(Number);
    if (selectedDate) {
      updateValue(selectedDate, h, m);
    } else {
      // Auto select today if time changed before date selected
      setSelectedDate(today);
      updateValue(today, h, m);
    }
  };

  const updateValue = (dateObj, h, m) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    onChange(`${year}-${month}-${day}T${hh}:${mm}`);
  };

  // Generate calendar grid arrays
  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  const daysArray = [];

  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push({ day: null, currentMonth: false });
  }

  for (let d = 1; d <= totalDays; d++) {
    const isPast = new Date(currentYear, currentMonth, d) < today;
    daysArray.push({ day: d, currentMonth: true, isPast });
  }

  return (
    <div className="bg-[#080808] border border-[#262626] rounded-md p-4 w-full flex flex-col gap-4 font-sans select-none">
      
      {/* Calendar Header with Dropdowns and Navigation */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2">
        <div className="flex items-center gap-2">
          {/* Month Selector Dropdown */}
          <select
            value={currentMonth}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCurrentMonth(val);
            }}
            className="bg-[#141414] border border-[#262626] rounded text-[#F4F4F5] py-1.5 px-2 text-xs focus:border-[#FFD700] focus:outline-none cursor-pointer font-bold"
          >
            {monthNames.map((name, index) => {
              const isPastMonth = currentYear === now.getFullYear() && index < now.getMonth();
              return (
                <option key={name} value={index} disabled={isPastMonth}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* Year Selector Dropdown */}
          <select
            value={currentYear}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCurrentYear(val);
              // Shift month if it lands in a past month for the current year
              if (val === now.getFullYear() && currentMonth < now.getMonth()) {
                setCurrentMonth(now.getMonth());
              }
            }}
            className="bg-[#141414] border border-[#262626] rounded text-[#F4F4F5] py-1.5 px-2 text-xs focus:border-[#FFD700] focus:outline-none cursor-pointer font-bold"
          >
            {years.map(yr => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Arrow Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={currentYear === now.getFullYear() && currentMonth === now.getMonth()}
            className="p-1.5 text-[#A1A1AA] hover:text-[#FFD700] hover:bg-[#141414] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 text-[#A1A1AA] hover:text-[#FFD700] hover:bg-[#141414] rounded transition-all cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-500 mb-2 font-mono">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-center">
          {daysArray.map((item, idx) => {
            if (item.day === null) {
              return <div key={`empty-${idx}`} className="py-2"></div>;
            }

            const isSelected = selectedDate &&
              selectedDate.getFullYear() === currentYear &&
              selectedDate.getMonth() === currentMonth &&
              selectedDate.getDate() === item.day;

            return (
              <button
                key={`day-${item.day}`}
                type="button"
                disabled={item.isPast}
                onClick={() => handleDateClick(item.day)}
                className={`
                  py-2 rounded font-semibold transition-all cursor-pointer
                  ${item.isPast 
                    ? 'text-zinc-700 line-through cursor-not-allowed opacity-30' 
                    : isSelected
                      ? 'bg-[#FFD700] text-black font-extrabold shadow shadow-yellow-500/20'
                      : 'text-[#E4E4E7] hover:bg-[#141414] hover:text-[#FFD700]'
                  }
                `}
              >
                {item.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Native Time Input Control */}
      <div className="border-t border-[#262626] pt-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[#A1A1AA] text-xs font-bold font-sans">
          <Clock size={14} className="text-[#FFD700]" />
          <span>SELECT TIME *</span>
        </div>

        <input
          type="time"
          required
          value={timeString}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="w-full bg-[#141414] border border-[#262626] rounded text-[#F4F4F5] py-2 px-3 text-xs focus:border-[#FFD700] focus:outline-none transition-all cursor-pointer font-semibold min-h-[44px]"
        />
      </div>

    </div>
  );
}
