import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Check, Save } from 'lucide-react';
import SitterAppHeader from '../../components/SitterAppHeader';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  day: string;
  timeSlots: TimeSlot[];
}

interface RecurringSchedule {
  id: string;
  daySchedules: DaySchedule[];
}

interface DateRangeAvailability {
  id: string;
  startDate: string;
  endDate: string;
  timeSlots: TimeSlot[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SitterAvailability() {
  // Load saved data from localStorage on mount
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>(() => {
    const saved = localStorage.getItem('sitter_recurring_schedules');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [dateRanges, setDateRanges] = useState<DateRangeAvailability[]>(() => {
    const saved = localStorage.getItem('sitter_date_ranges');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTab, setActiveTab] = useState<'recurring' | 'specific'>('recurring');
  
  // Current editing states
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [dayTimeSlots, setDayTimeSlots] = useState<Map<string, TimeSlot[]>>(new Map());
  
  // Date range editing state
  const [currentDateRange, setCurrentDateRange] = useState<DateRangeAvailability>({
    id: generateId(),
    startDate: '',
    endDate: '',
    timeSlots: []
  });
  
  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('sitter_recurring_schedules', JSON.stringify(recurringSchedules));
  }, [recurringSchedules]);
  
  useEffect(() => {
    localStorage.setItem('sitter_date_ranges', JSON.stringify(dateRanges));
  }, [dateRanges]);
  
  // Toggle day selection
  const toggleDay = (day: string) => {
    const newSelected = new Set(selectedDays);
    if (newSelected.has(day)) {
      newSelected.delete(day);
      const newDayTimeSlots = new Map(dayTimeSlots);
      newDayTimeSlots.delete(day);
      setDayTimeSlots(newDayTimeSlots);
    } else {
      newSelected.add(day);
      if (!dayTimeSlots.has(day)) {
        const newDayTimeSlots = new Map(dayTimeSlots);
        newDayTimeSlots.set(day, [{ id: generateId(), startTime: '09:00', endTime: '17:00' }]);
        setDayTimeSlots(newDayTimeSlots);
      }
    }
    setSelectedDays(newSelected);
  };
  
  // Add time slot for a specific day
  const addTimeSlot = (day: string) => {
    const newDayTimeSlots = new Map(dayTimeSlots);
    const slots = newDayTimeSlots.get(day) || [];
    slots.push({ id: generateId(), startTime: '09:00', endTime: '17:00' });
    newDayTimeSlots.set(day, slots);
    setDayTimeSlots(newDayTimeSlots);
  };
  
  // Remove time slot for a specific day
  const removeTimeSlot = (day: string, slotId: string) => {
    const newDayTimeSlots = new Map(dayTimeSlots);
    const slots = newDayTimeSlots.get(day) || [];
    const filtered = slots.filter(slot => slot.id !== slotId);
    if (filtered.length > 0) {
      newDayTimeSlots.set(day, filtered);
    } else {
      newDayTimeSlots.delete(day);
    }
    setDayTimeSlots(newDayTimeSlots);
  };
  
  // Update time slot
  const updateTimeSlot = (day: string, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    const newDayTimeSlots = new Map(dayTimeSlots);
    const slots = newDayTimeSlots.get(day) || [];
    const updated = slots.map(slot => 
      slot.id === slotId ? { ...slot, [field]: value } : slot
    );
    newDayTimeSlots.set(day, updated);
    setDayTimeSlots(newDayTimeSlots);
  };
  
  // Save recurring schedule
  const saveRecurringSchedule = () => {
    if (selectedDays.size === 0) {
      alert('Please select at least one day');
      return;
    }
    
    const daySchedules: DaySchedule[] = Array.from(selectedDays).map(day => ({
      day,
      timeSlots: dayTimeSlots.get(day) || []
    }));
    
    if (daySchedules.some(ds => ds.timeSlots.length === 0)) {
      alert('Please add at least one time slot for each selected day');
      return;
    }
    
    const newSchedule: RecurringSchedule = {
      id: generateId(),
      daySchedules
    };
    
    setRecurringSchedules([...recurringSchedules, newSchedule]);
    
    // Reset form
    setSelectedDays(new Set());
    setDayTimeSlots(new Map());
    
    alert('Recurring schedule saved!');
  };
  
  // Delete recurring schedule
  const deleteRecurringSchedule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      setRecurringSchedules(recurringSchedules.filter(s => s.id !== id));
    }
  };
  
  // Add time slot to date range
  const addDateRangeTimeSlot = () => {
    setCurrentDateRange(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { id: generateId(), startTime: '09:00', endTime: '17:00' }]
    }));
  };
  
  // Remove time slot from date range
  const removeDateRangeTimeSlot = (slotId: string) => {
    setCurrentDateRange(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(slot => slot.id !== slotId)
    }));
  };
  
  // Update date range time slot
  const updateDateRangeTimeSlot = (slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setCurrentDateRange(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map(slot =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      )
    }));
  };
  
  // Save date range
  const saveDateRange = () => {
    if (!currentDateRange.startDate || !currentDateRange.endDate) {
      alert('Please select start and end dates');
      return;
    }
    
    if (currentDateRange.startDate > currentDateRange.endDate) {
      alert('End date must be after start date');
      return;
    }
    
    if (currentDateRange.timeSlots.length === 0) {
      alert('Please add at least one time slot');
      return;
    }
    
    setDateRanges([...dateRanges, currentDateRange]);
    
    // Reset form
    setCurrentDateRange({
      id: generateId(),
      startDate: '',
      endDate: '',
      timeSlots: []
    });
    
    alert('Date range saved!');
  };
  
  // Delete date range
  const deleteDateRange = (id: string) => {
    if (window.confirm('Are you sure you want to delete this date range?')) {
      setDateRanges(dateRanges.filter(d => d.id !== id));
    }
  };
  
  // Save all to backend
  const saveAllToBackend = async () => {
    const data = {
      recurring: recurringSchedules,
      dateRanges: dateRanges
    };
    
    console.log('Saving to backend:', data);
    
    // TODO: Call backend API
    // await availabilityService.saveAvailability(data);
    
    alert('All availability saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <SitterAppHeader
        navItems={[
          { label: 'User Portal', to: '/' },
          { label: 'Dashboard', to: '/sitter/dashboard' },
          { label: 'Messages', to: '/sitter/messages' },
          { label: 'Availability', to: '/sitter/availability' }
        ]}
      />

      {/* Main Content */}
      <div className="max-w-6xl px-4 py-8 mx-auto">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">Set Your Availability</h1>
          <p className="text-lg text-gray-600">
            Let clients know when you're available for plant care services
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex justify-center border-b border-gray-200">
            <button
              onClick={() => setActiveTab('recurring')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'recurring'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="inline-block w-5 h-5 mr-2" />
              Recurring Weekly Schedule
            </button>
            <button
              onClick={() => setActiveTab('specific')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'specific'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="inline-block w-5 h-5 mr-2" />
              Specific Date Ranges
            </button>
          </div>
        </div>

        {/* Recurring Weekly Schedule Tab */}
        {activeTab === 'recurring' && (
          <div className="space-y-6">
            {/* Add New Schedule Form */}
            <div className="p-8 bg-white shadow-lg rounded-2xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">
                Add Recurring Weekly Schedule
              </h3>
              
              {/* Day Selection */}
              <div className="mb-8">
                <label className="block mb-3 text-sm font-semibold text-gray-700">
                  Select Days of the Week
                </label>
                <div className="flex flex-wrap gap-3">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                        selectedDays.has(day)
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-105'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300 hover:shadow'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots for Each Selected Day */}
              {Array.from(selectedDays).map(day => (
                <div key={day} className="p-6 mb-4 border-2 border-emerald-100 bg-emerald-50/50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-gray-900">{day}</h4>
                    <button
                      onClick={() => addTimeSlot(day)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 hover:shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      Add Time Slot
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(dayTimeSlots.get(day) || []).map(slot => (
                      <div key={slot.id} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateTimeSlot(day, slot.id, 'startTime', e.target.value)}
                          className="px-4 py-2 font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <span className="font-semibold text-gray-500">to</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateTimeSlot(day, slot.id, 'endTime', e.target.value)}
                          className="px-4 py-2 font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <button
                          onClick={() => removeTimeSlot(day, slot.id)}
                          className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {selectedDays.size === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p>Select days above to set their available time slots</p>
                </div>
              )}

              {selectedDays.size > 0 && (
                <button
                  onClick={saveRecurringSchedule}
                  className="flex items-center justify-center w-full gap-2 px-6 py-3 mt-6 text-lg font-semibold text-white transition-all shadow-md bg-emerald-600 rounded-xl hover:bg-emerald-700 hover:shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  Save Recurring Schedule
                </button>
              )}
            </div>

            {/* Saved Recurring Schedules */}
            {recurringSchedules.length > 0 && (
              <div className="p-8 bg-white shadow-lg rounded-2xl">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  Your Recurring Schedules
                </h3>
                <div className="space-y-4">
                  {recurringSchedules.map(schedule => (
                    <div key={schedule.id} className="p-6 transition-all border-2 border-gray-200 rounded-xl hover:shadow-md">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {schedule.daySchedules.map(ds => (
                              <span key={ds.day} className="px-3 py-1 text-sm font-semibold rounded-full text-emerald-700 bg-emerald-100">
                                {ds.day}
                              </span>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {schedule.daySchedules.map(ds => (
                              <div key={ds.day} className="pl-4 border-l-4 border-emerald-200">
                                <span className="font-semibold text-gray-700">{ds.day}: </span>
                                {ds.timeSlots.map((slot, idx) => (
                                  <span key={slot.id} className="text-gray-600">
                                    {idx > 0 && ', '}
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteRecurringSchedule(schedule.id)}
                          className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Specific Date Ranges Tab */}
        {activeTab === 'specific' && (
          <div className="space-y-6">
            {/* Add New Date Range Form */}
            <div className="p-8 bg-white shadow-lg rounded-2xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">
                Add Specific Date Range
              </h3>
              
              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={currentDateRange.startDate}
                    onChange={(e) => setCurrentDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={currentDateRange.endDate}
                    onChange={(e) => setCurrentDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-gray-700">
                    Available Time Slots
                  </label>
                  <button
                    onClick={addDateRangeTimeSlot}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700 hover:shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Time Slot
                  </button>
                </div>
                
                <div className="space-y-3">
                  {currentDateRange.timeSlots.map(slot => (
                    <div key={slot.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateDateRangeTimeSlot(slot.id, 'startTime', e.target.value)}
                        className="px-4 py-2 font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <span className="font-semibold text-gray-500">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateDateRangeTimeSlot(slot.id, 'endTime', e.target.value)}
                        className="px-4 py-2 font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <button
                        onClick={() => removeDateRangeTimeSlot(slot.id)}
                        className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  
                  {currentDateRange.timeSlots.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      <Clock className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p>Click "Add Time Slot" to set available times</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={saveDateRange}
                className="flex items-center justify-center w-full gap-2 px-6 py-3 text-lg font-semibold text-white transition-all shadow-md bg-emerald-600 rounded-xl hover:bg-emerald-700 hover:shadow-lg"
              >
                <Save className="w-5 h-5" />
                Save Date Range
              </button>
            </div>

            {/* Saved Date Ranges */}
            {dateRanges.length > 0 && (
              <div className="p-8 bg-white shadow-lg rounded-2xl">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  Your Saved Date Ranges
                </h3>
                <div className="space-y-4">
                  {dateRanges.map(range => (
                    <div key={range.id} className="p-6 transition-all border-2 border-gray-200 rounded-xl hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-gray-500">Period: </span>
                            <span className="text-lg font-bold text-gray-900">
                              {new Date(range.startDate).toLocaleDateString()} - {new Date(range.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-sm font-semibold text-gray-500">Time Slots: </span>
                            {range.timeSlots.map((slot, idx) => (
                              <div key={slot.id} className="ml-4 text-gray-600">
                                {slot.startTime} - {slot.endTime}
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDateRange(range.id)}
                          className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save All Button */}
        {(recurringSchedules.length > 0 || dateRanges.length > 0) && (
          <div className="p-6 mt-8 border-2 border-emerald-200 bg-emerald-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Ready to publish your availability?</h4>
                <p className="text-sm text-gray-600">
                  You have {recurringSchedules.length} recurring schedule(s) and {dateRanges.length} date range(s) saved
                </p>
              </div>
              <button
                onClick={saveAllToBackend}
                className="flex items-center gap-2 px-8 py-3 text-lg font-semibold text-white transition-all shadow-lg bg-emerald-600 rounded-xl hover:bg-emerald-700 hover:shadow-xl"
              >
                <Check className="w-5 h-5" />
                Publish Availability
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
