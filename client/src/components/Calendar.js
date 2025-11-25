import React, { useState } from 'react';
import './Calendar.css';

const Calendar = ({ reservedDates }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 해당 날짜가 예약되었는지 확인
  const isDateReserved = (date) => {
    return reservedDates.some(reserved => {
      const start = new Date(reserved.startDate);
      const end = new Date(reserved.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      return date >= start && date <= end;
    });
  };

  // 현재 월의 첫날과 마지막날
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // 달력 시작일 (이전 달의 날짜 포함)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  // 달력 종료일 (다음 달의 날짜 포함)
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  // 달력에 표시할 모든 날짜 생성
  const calendarDays = [];
  const currentDay = new Date(startDate);
  
  while (currentDay <= endDate) {
    calendarDays.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 오늘 날짜인지 확인
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // 현재 월의 날짜인지 확인
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="calendar-nav-btn">
          ◀
        </button>
        <h3 className="calendar-title">
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </h3>
        <button onClick={goToNextMonth} className="calendar-nav-btn">
          ▶
        </button>
      </div>

      <div className="calendar-grid">
        {/* 요일 헤더 */}
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div key={day} className={`calendar-day-header ${index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}`}>
            {day}
          </div>
        ))}

        {/* 날짜 */}
        {calendarDays.map((date, index) => {
          const reserved = isDateReserved(date);
          const today = isToday(date);
          const currentMonth = isCurrentMonth(date);

          return (
            <div
              key={index}
              className={`calendar-day 
                ${!currentMonth ? 'other-month' : ''} 
                ${reserved ? 'reserved' : ''} 
                ${today ? 'today' : ''}
                ${date.getDay() === 0 ? 'sunday' : date.getDay() === 6 ? 'saturday' : ''}
              `}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color available"></span>
          <span>대여 가능</span>
        </div>
        <div className="legend-item">
          <span className="legend-color reserved"></span>
          <span>예약됨</span>
        </div>
        <div className="legend-item">
          <span className="legend-color today"></span>
          <span>오늘</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

