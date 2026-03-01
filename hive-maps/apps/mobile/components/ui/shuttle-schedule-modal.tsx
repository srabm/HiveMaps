import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

type ShuttleScheduleModalProps = {
    visible: boolean;
    directionLabel: string;
    serviceDateLabel?: string;
    times: string[];
    onClose: () => void;
};

export function ShuttleScheduleModal({
    visible,
    directionLabel,
    serviceDateLabel,
    times,
    onClose,
}: ShuttleScheduleModalProps) {
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
                    <Text style={styles.scheduleModalSubtitle}>{directionLabel}</Text>
                    {serviceDateLabel ? (
                        <Text style={styles.scheduleModalMeta}>{serviceDateLabel}</Text>
                    ) : null}
                    <ScrollView style={styles.scheduleModalList} contentContainerStyle={styles.scheduleModalListContent}>
                        {times.map((time) => (
                            <View key={`${directionLabel}-${time}`} style={styles.scheduleModalRow}>
                                <Text style={styles.scheduleModalTime}>{time}</Text>
                            </View>
                        ))}
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
    scheduleModalSubtitle: {fontSize: 13, fontWeight: '600', color: '#111827'},
    scheduleModalMeta: {fontSize: 12, color: '#6B7280', marginBottom: 8},
    scheduleModalList: {marginTop: 4},
    scheduleModalListContent: {paddingBottom: 8},
    scheduleModalRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    scheduleModalTime: {fontSize: 14, fontWeight: '600', color: '#111827'},
});