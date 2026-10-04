export function getLatestResetTimestamp(): Date {
    const now = new Date();
    const resetToday = new Date(now);
  
    // 4:00 PM MYT is 08:00:00 UTC
    resetToday.setUTCHours(8, 0, 0, 0);
  
    // If current UTC time is before 08:00 UTC, the latest reset was yesterday at 08:00 UTC
    if (now.getTime() < resetToday.getTime()) {
      resetToday.setUTCDate(resetToday.getUTCDate() - 1);
    }
  
    return resetToday;
  }