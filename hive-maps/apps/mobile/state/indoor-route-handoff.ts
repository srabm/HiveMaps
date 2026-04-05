let completedOriginIndoorSessionId: string | null = null;
let completedDestinationIndoorSessionId: string | null = null;

export function markOriginIndoorSessionCompleted(sessionId: string) {
    completedOriginIndoorSessionId = sessionId;
}

export function consumeCompletedOriginIndoorSession(sessionId: string | null): boolean {
    if (!sessionId) return false;
    if (completedOriginIndoorSessionId !== sessionId) return false;
    completedOriginIndoorSessionId = null;
    return true;
}

export function markDestinationIndoorSessionCompleted(sessionId: string) {
    completedDestinationIndoorSessionId = sessionId;
}

export function consumeCompletedDestinationIndoorSession(sessionId: string | null): boolean {
    if (!sessionId) return false;
    if (completedDestinationIndoorSessionId !== sessionId) return false;
    completedDestinationIndoorSessionId = null;
    return true;
}
