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
}: ShuttleScheduleSectionProps) {
    return (
        <View style={styles.shuttleSection}>
            <View style={styles.shuttleHeaderRow}>
                <Text style={styles.shuttleTitle}>Shuttle Schedule</Text>
                {validPeriod ? <Text style={styles.shuttleSubtle}>{validPeriod}</Text> : null}
            </View>

            {!hasSchedule && (
                <View style={styles.unavailableContainer}>
                    <Text style={styles.shuttleEmptyText}>The shuttle service is currently unavailable.</Text>
                    {onFallbackPress && (
                        <Pressable onPress={onFallbackPress} style={styles.fallbackButton}>
                            <Text style={styles.fallbackButtonText}>View Transit Alternatives</Text>
                        </Pressable>
                    )}
                </View>
            )}

            {hasSchedule && (
                <View style={styles.shuttleList}>
                    <View style={styles.directionHeader}>
                        <Text style={styles.shuttleListTitle}>{directionLabel}</Text>
                        {showNextServiceLabel && nextServiceLabel && (
                             <View style={styles.nextServiceBadge}>
                                 <Text style={styles.nextServiceBadgeText}>Next service: {nextServiceLabel}</Text>
                             </View>
                        )}
                    </View>

                    {showNextServiceLabel && onFallbackPress && (
                        <Pressable onPress={onFallbackPress} style={styles.fallbackButtonInline}>
                            <Text style={styles.fallbackButtonTextInline}>Shuttle is not running today. Try Transit instead?</Text>
                        </Pressable>
                    )}

                    {departures.length === 0 && !showNextServiceLabel ? (
                        <View style={styles.unavailableContainer}>
                            <Text style={styles.shuttleEmptyText}>No more departures today.</Text>
                            {onFallbackPress && (
                                <Pressable onPress={onFallbackPress} style={styles.fallbackButton}>
                                    <Text style={styles.fallbackButtonText}>View Transit Alternatives</Text>
                                </Pressable>
                            )}
                        </View>
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
    directionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    shuttleListTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9d1e30',
    },
    nextServiceBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    nextServiceBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#374151',
    },
    shuttleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    shuttleTime: {fontSize: 12, color: '#111827', fontWeight: '600'},
    shuttleEta: {fontSize: 11, color: '#6B7280'},
    shuttleEmptyText: {fontSize: 11, color: '#6B7280'},
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
    unavailableContainer: {
        paddingVertical: 8,
    },
    fallbackButton: {
        marginTop: 10,
        backgroundColor: '#9d1e30',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    fallbackButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    fallbackButtonInline: {
        marginBottom: 12,
        backgroundColor: '#FFFBEB',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    fallbackButtonTextInline: {
        color: '#92400E',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});
