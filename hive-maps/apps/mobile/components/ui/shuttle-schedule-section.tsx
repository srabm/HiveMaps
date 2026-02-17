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
}: ShuttleScheduleSectionProps) {
    return (
        <View style={styles.shuttleSection}>
            <View style={styles.shuttleHeaderRow}>
                <Text style={styles.shuttleTitle}>Shuttle Schedule</Text>
                {validPeriod ? <Text style={styles.shuttleSubtle}>{validPeriod}</Text> : null}
            </View>

            {!hasSchedule && (
                <Text style={styles.shuttleEmptyText}>No shuttle schedule available today.</Text>
            )}

            {hasSchedule && (
                <View style={styles.shuttleList}>
                    <Text style={styles.shuttleListTitle}>{directionLabel}</Text>
                    {showNextServiceLabel && nextServiceLabel ? (
                        <Text style={styles.shuttleNextService}>Next service: {nextServiceLabel}</Text>
                    ) : null}
                    {departures.length === 0 ? (
                        <Text style={styles.shuttleEmptyText}>No more departures today.</Text>
                    ) : (
                        departures.map((item) => (
                            <View key={item.key} style={styles.shuttleRow}>
                                <Text style={styles.shuttleTime}>{item.timeLabel}</Text>
                                <Text style={styles.shuttleEta}>{item.etaLabel}</Text>
                            </View>
                        ))
                    )}
                    {showSeeMoreButton && (
                        <Pressable onPress={onOpenModal} style={styles.shuttleSeeMoreButton}>
                            <Text style={styles.shuttleSeeMoreText}>See more</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    shuttleSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    shuttleHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    shuttleTitle: {fontSize: 14, fontWeight: '700', color: '#111827'},
    shuttleSubtle: {fontSize: 11, color: '#6B7280'},
    shuttleList: {
        flex: 1,
    },
    shuttleListTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9d1e30',
        marginBottom: 6,
    },
    shuttleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    shuttleTime: {fontSize: 12, color: '#111827', fontWeight: '600'},
    shuttleEta: {fontSize: 11, color: '#6B7280'},
    shuttleEmptyText: {fontSize: 11, color: '#6B7280'},
    shuttleNextService: {fontSize: 11, color: '#6B7280', marginBottom: 6},
    shuttleSeeMoreButton: {
        marginTop: 6,
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    shuttleSeeMoreText: {fontSize: 11, fontWeight: '600', color: '#9d1e30'},
});
