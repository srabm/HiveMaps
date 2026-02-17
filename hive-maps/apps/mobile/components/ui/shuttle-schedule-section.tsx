import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

type ShuttleScheduleSectionProps = {
    directionLabel: string;
    validPeriod?: string;
    hasSchedule: boolean;
    showNextServiceLabel: boolean;
    nextServiceLabel?: string;
    departures: Array<{timeLabel: string; etaLabel: string; key: string}>;
    showSeeMoreButton: boolean;
    onOpenModal: () => void;
    onFallbackPress?: () => void;
    /** When true, removes the top margin/border separator (metrics row is hidden above) */
    noTopSpacing?: boolean;
};

export function ShuttleScheduleSection({
    directionLabel,
    validPeriod,
    hasSchedule,
    showNextServiceLabel,
    nextServiceLabel,
    departures,
    showSeeMoreButton,
    onOpenModal,
    onFallbackPress,
    noTopSpacing,
}: ShuttleScheduleSectionProps) {
    const showTransitSuggestion =
        (!hasSchedule || showNextServiceLabel || departures.length === 0) && !!onFallbackPress;
    const suggestionText = !hasSchedule
        ? 'Service currently unavailable.'
        : 'Not running today — need a ride now?';

    return (
        <View style={[styles.shuttleSection, noTopSpacing && styles.shuttleSectionNoTopSpacing]}>
            {showTransitSuggestion && (
                <Pressable onPress={onFallbackPress} style={styles.transitSuggestion}>
                    <Text style={styles.transitSuggestionText}>{suggestionText}</Text>
                    <Text style={styles.transitSuggestionLink}>Check Transit</Text>
                </Pressable>
            )}

            <View style={styles.shuttleHeaderRow}>
                <View>
                    <Text style={styles.shuttleTitle}>Shuttle Schedule</Text>
                    {validPeriod ? (
                        <Text style={styles.shuttleSubtle}>Valid {validPeriod}</Text>
                    ) : null}
                </View>
                {showSeeMoreButton && (
                    <Pressable onPress={onOpenModal}>
                        <Text style={styles.seeMoreLink}>See full schedule</Text>
                    </Pressable>
                )}
            </View>

            {hasSchedule && (
                <View>
                    <View style={styles.directionHeader}>
                        <Text style={styles.shuttleListTitle}>
                            {directionLabel}
                            {showNextServiceLabel && nextServiceLabel
                                ? <Text style={styles.nextServiceInline}>{'  ·  '}Next: {nextServiceLabel}</Text>
                                : null}
                        </Text>
                    </View>

                    {departures.length === 0 && !showNextServiceLabel ? (
                        <Text style={styles.shuttleEmptyText}>No more departures today.</Text>
                    ) : (
                        departures.map((item) => (
                            <View key={item.key} style={styles.shuttleRow}>
                                <Text style={styles.shuttleTime}>{item.timeLabel}</Text>
                                <Text style={styles.shuttleEta}>{item.etaLabel}</Text>
                            </View>
                        ))
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    shuttleSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    shuttleSectionNoTopSpacing: {
        marginTop: 4,
        paddingTop: 6,
        borderTopWidth: 0,
    },
    shuttleHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    shuttleTitle: {fontSize: 13, fontWeight: '700', color: '#111827'},
    shuttleSubtle: {fontSize: 11, fontWeight: '400', color: '#9CA3AF', marginTop: 1},
    directionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 6,
        marginBottom: 4,
    },
    shuttleListTitle: {fontSize: 12, fontWeight: '700', color: '#9d1e30'},
    nextServiceInline: {fontSize: 11, fontWeight: '400', color: '#6B7280'},
    shuttleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 2,
    },
    // Departure time is the primary info — larger and bold
    shuttleTime: {fontSize: 14, color: '#111827', fontWeight: '600'},
    // ETA is secondary — smaller, muted
    shuttleEta: {fontSize: 12, color: '#6B7280'},
    shuttleEmptyText: {fontSize: 12, color: '#6B7280'},
    transitSuggestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    transitSuggestionText: {fontSize: 12, color: '#6B7280'},
    transitSuggestionLink: {fontSize: 12, fontWeight: '700', color: '#9d1e30'},
    seeMoreLink: {fontSize: 12, fontWeight: '600', color: '#9d1e30'},
});