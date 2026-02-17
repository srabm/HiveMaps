/**
 * Convert Date to ISO 8601 format without milliseconds (YYYY-MM-DDThh:mm:ssZ)
 */
function toISOString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

/**
 * Convert ISO 8601 timestamp to human-readable time (e.g., "9:30 AM")
 * @param isoString ISO 8601 formatted string (YYYY-MM-DDThh:mm:ssZ)
 * @returns Human-readable time string (h:mm AM/PM)
 */
export function formatISOToTime(isoString: string): string {
    try {
        const date = new Date(isoString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const displayHours = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const paddedMinutes = String(minutes).padStart(2, '0');
        return `${displayHours}:${paddedMinutes} ${ampm}`;
    } catch {
        return 'Error displaying time';
    }
}

/**
 * Convert human-readable time to ISO 8601 format
 * @param timeString Human-readable time (h:mm AM/PM)
 * @returns ISO 8601 formatted string (YYYY-MM-DDThh:mm:ssZ)
 */
export function formatTimeToISO(timeString: string): string {
    try {
        const match = timeString.match(/(\d+):(\d+)\s(AM|PM)/);
        if (!match) return toISOString(new Date());

        const [, hourStr, minuteStr, period] = match;
        let hours = parseInt(hourStr, 10);
        const minutes = parseInt(minuteStr, 10);

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        const now = new Date();
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        return toISOString(date);
    } catch {
        return toISOString(new Date());
    }
}

/**
 * Get current time in ISO 8601 format
 * @returns ISO 8601 formatted string (YYYY-MM-DDThh:mm:ssZ)
 */
export function getCurrentTimeISO(): string {
    return toISOString(new Date());
}
