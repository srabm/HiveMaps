import React, {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

type ShuttleScheduleModalProps = {
    visible: boolean;
    serviceDateLabel?: string;
    tabs: Array<{
        key: string;
        label: string;
        items: Array<{ key: string; timeLabel: string; isPast: boolean; isNext: boolean }>;
    }>;
    initialTabKey?: string;
    onClose: () => void;
};

export function ShuttleScheduleModal({
    visible,
    serviceDateLabel,
    tabs,
    initialTabKey,
    onClose,
}: Readonly<ShuttleScheduleModalProps>) {
    const defaultTabKey = initialTabKey ?? tabs[0]?.key ?? 'to-loyola';
    const [activeTabKey, setActiveTabKey] = useState(defaultTabKey);

    useEffect(() => {
        if (visible) {
            setActiveTabKey(defaultTabKey);
        }
    }, [defaultTabKey, visible]);

    const activeTab = tabs.find((tab) => tab.key === activeTabKey) ?? tabs[0];

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.scheduleModalCard}>
                    <View style={styles.scheduleModalHeader}>
                        <Text style={styles.scheduleModalTitle}>Shuttle Schedule</Text>
                        <Pressable onPress={onClose}>
                            <Text style={styles.scheduleModalClose}>Close</Text>
                        </Pressable>
                    </View>
                    {serviceDateLabel ? (
                        <Text style={styles.scheduleModalMeta}>{serviceDateLabel}</Text>
                    ) : null}
                    <View style={styles.scheduleModalTabs}>
                        {tabs.map((tab) => (
                            <Pressable
                                key={tab.key}
                                onPress={() => setActiveTabKey(tab.key)}
                                style={[
                                    styles.scheduleModalTab,
                                    activeTab?.key === tab.key && styles.scheduleModalTabActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.scheduleModalTabText,
                                        activeTab?.key === tab.key && styles.scheduleModalTabTextActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <ScrollView style={styles.scheduleModalList} contentContainerStyle={styles.scheduleModalListContent}>
                        {activeTab?.items.map((item) => (
                            <View
                                key={item.key}
                                style={[
                                    styles.scheduleModalRow,
                                    item.isNext && styles.scheduleModalRowNext,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.scheduleModalTime,
                                        item.isPast && styles.scheduleModalTimePast,
                                        item.isNext && styles.scheduleModalTimeNext,
                                    ]}
                                >
                                    {item.timeLabel}
                                </Text>
                                {item.isNext ? (
                                    <Text style={styles.scheduleModalBadge}>Next</Text>
                                ) : null}
                            </View>
                        ))}
                        {(activeTab?.items.length ?? 0) === 0 ? (
                            <View style={styles.scheduleModalRow}>
                                <Text style={styles.scheduleModalEmpty}>No departures available.</Text>
                            </View>
                        ) : null}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    scheduleModalCard: {
        width: '92%',
        maxHeight: '70%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 12,
        elevation: 8,
    },
    scheduleModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    scheduleModalTitle: {fontSize: 16, fontWeight: '700', color: '#111827'},
    scheduleModalClose: {fontSize: 12, fontWeight: '600', color: '#9d1e30'},
    scheduleModalMeta: {fontSize: 12, color: '#6B7280', marginBottom: 8},
    scheduleModalTabs: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    scheduleModalTab: {
        flex: 1,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    scheduleModalTabActive: {
        backgroundColor: '#9d1e30',
        borderColor: '#9d1e30',
    },
    scheduleModalTabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
    },
    scheduleModalTabTextActive: {
        color: '#FFFFFF',
    },
    scheduleModalList: {marginTop: 4},
    scheduleModalListContent: {paddingBottom: 8},
    scheduleModalRow: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scheduleModalTime: {fontSize: 14, fontWeight: '600', color: '#111827'},
    scheduleModalTimePast: {color: '#9CA3AF'},
    scheduleModalRowNext: {
        backgroundColor: '#ECFDF5',
        borderRadius: 10,
        borderBottomWidth: 0,
        marginBottom: 6,
    },
    scheduleModalTimeNext: {color: '#047857'},
    scheduleModalBadge: {fontSize: 12, fontWeight: '700', color: '#047857'},
    scheduleModalEmpty: {fontSize: 13, color: '#6B7280'},
});
