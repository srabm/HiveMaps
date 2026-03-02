import React, {useRef, useState, useEffect, useMemo} from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import {formatISOToTime, formatTimeToISO} from '@/utils/timeFormatter';
import {TimeFilterMode} from '@/services/maps/directions-api-adapter';

interface TimePickerModalProps {
    visible: boolean;
    onConfirm: (time: string, mode: TimeFilterMode) => void;
    onCancel: () => void;
    initialTime?: string;
    initialMode?: TimeFilterMode;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export function TimePickerModal({
                                    visible,
                                    onConfirm,
                                    onCancel,
                                    initialTime = new Date().toISOString(),
                                    initialMode = 'depart',
                                }: Readonly<TimePickerModalProps>) {
    const hours = Array.from({length: 12}, (_, i) => String((i + 12) % 12 || 12).padStart(2, '0'));
    const minutes = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));
    const periods = ['AM', 'PM'];

    const parseInitialTime = () => {
        const readableTime = formatISOToTime(initialTime);
        const match = readableTime.match(/(\d+):(\d+)\s(AM|PM)/);
        if (match) {
            return {
                hour: match[1].padStart(2, '0'),
                minute: match[2],
                period: match[3],
            };
        }
        return {hour: '09', minute: '00', period: 'AM'};
    };

    const initial = parseInitialTime();
    const [selectedHour, setSelectedHour] = useState(initial.hour);
    const [selectedMinute, setSelectedMinute] = useState(initial.minute);
    const [selectedPeriod, setSelectedPeriod] = useState(initial.period);
    const [timeMode, setTimeMode] = useState<TimeFilterMode>(initialMode);

    const hourScrollRef = useRef<ScrollView>(null);
    const minuteScrollRef = useRef<ScrollView>(null);
    const periodScrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible) {
            const next = parseInitialTime();
            setSelectedHour(next.hour);
            setSelectedMinute(next.minute);
            setSelectedPeriod(next.period);
            setTimeMode(initialMode);

            setTimeout(() => {
                const hourIndex = hours.indexOf(next.hour);
                const minuteIndex = minutes.indexOf(next.minute);
                const periodIndex = periods.indexOf(next.period);

                hourScrollRef.current?.scrollTo({
                    y: hourIndex * ITEM_HEIGHT,
                    animated: false,
                });
                minuteScrollRef.current?.scrollTo({
                    y: minuteIndex * ITEM_HEIGHT,
                    animated: false,
                });
                periodScrollRef.current?.scrollTo({
                    y: periodIndex * ITEM_HEIGHT,
                    animated: false,
                });
            }, 0);
        }
    }, [visible, initialTime, initialMode]);

    const handleHourScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        setSelectedHour(hours[Math.max(0, Math.min(index, hours.length - 1))]);
    };

    const handleMinuteScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        setSelectedMinute(minutes[Math.max(0, Math.min(index, minutes.length - 1))]);
    };

    const handlePeriodScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        setSelectedPeriod(periods[Math.max(0, Math.min(index, periods.length - 1))]);
    };

    const handleConfirm = () => {
        if (isPastSelection) return;
        const timeString = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
        const isoString = formatTimeToISO(timeString);
        onConfirm(isoString, timeMode);
    };

    const isPastSelection = useMemo(() => {
        let hours = Number(selectedHour) % 12;
        if (selectedPeriod === 'PM') {
            hours += 12;
        }
        const minutes = Number(selectedMinute);
        const now = new Date();
        const selectedDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes,
            0,
            0,
        );
        const nowAtMinute = new Date(now);
        nowAtMinute.setSeconds(0, 0);
        return selectedDate.getTime() < nowAtMinute.getTime();
    }, [selectedHour, selectedMinute, selectedPeriod]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={styles.timeModeContainer}>
                            <Pressable
                                style={[
                                    styles.timeModeButton,
                                    timeMode === 'depart' && styles.timeModeButtonActive,
                                ]}
                                onPress={() => setTimeMode('depart')}
                            >
                                <Text
                                    style={[
                                        styles.timeModeText,
                                        timeMode === 'depart' && styles.timeModeTextActive,
                                    ]}
                                >
                                    Depart At
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.timeModeButton,
                                    timeMode === 'arrive' && styles.timeModeButtonActive,
                                ]}
                                onPress={() => setTimeMode('arrive')}
                            >
                                <Text
                                    style={[
                                        styles.timeModeText,
                                        timeMode === 'arrive' && styles.timeModeTextActive,
                                    ]}
                                >
                                    Arrive By
                                </Text>
                            </Pressable>
                        </View>
                        <Pressable onPress={onCancel} style={styles.closeButtonContainer}>
                            <Text style={styles.closeButton}>✕</Text>
                        </Pressable>
                    </View>

                    <View style={styles.pickerContainer}>
                        {/* Hours */}
                        <View style={styles.wheelContainer}>
                            <ScrollView
                                ref={hourScrollRef}
                                onMomentumScrollEnd={handleHourScroll}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="fast"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {hours.map((hour) => (
                                    <View key={hour} style={styles.itemWrapper}>
                                        <Text
                                            style={[
                                                styles.itemText,
                                                selectedHour === hour && styles.selectedItemText,
                                            ]}
                                        >
                                            {hour}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Divider */}
                        <Text style={styles.divider}>:</Text>

                        {/* Minutes */}
                        <View style={styles.wheelContainer}>
                            <ScrollView
                                ref={minuteScrollRef}
                                onMomentumScrollEnd={handleMinuteScroll}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="fast"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {minutes.map((minute) => (
                                    <View key={minute} style={styles.itemWrapper}>
                                        <Text
                                            style={[
                                                styles.itemText,
                                                selectedMinute === minute && styles.selectedItemText,
                                            ]}
                                        >
                                            {minute}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        {/* AM/PM */}
                        <View style={styles.wheelContainerSmall}>
                            <ScrollView
                                ref={periodScrollRef}
                                onMomentumScrollEnd={handlePeriodScroll}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="fast"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {periods.map((period) => (
                                    <View key={period} style={styles.itemWrapper}>
                                        <Text
                                            style={[
                                                styles.itemText,
                                                selectedPeriod === period && styles.selectedItemText,
                                            ]}
                                        >
                                            {period}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {isPastSelection && (
                        <Text style={styles.validationText}>
                            Selected time is in the past. Pick a current or future time.
                        </Text>
                    )}

                    <View style={styles.buttonRow}>
                        <Pressable onPress={onCancel} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleConfirm}
                            style={[styles.confirmButton, isPastSelection && styles.confirmButtonDisabled]}
                            disabled={isPastSelection}
                        >
                            <Text style={[styles.confirmButtonText, isPastSelection && styles.confirmButtonTextDisabled]}>
                                Confirm
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        position: 'relative',
    },
    timeModeContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        overflow: 'hidden',
        gap: 4,
        padding: 4,
    },
    timeModeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeModeButtonActive: {
        backgroundColor: '#9d1e30',
    },
    timeModeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    timeModeTextActive: {
        color: '#FFFFFF',
    },
    closeButtonContainer: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    closeButton: {
        fontSize: 24,
        color: '#6B7280',
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    wheelContainer: {
        width: 70,
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
    },
    wheelContainerSmall: {
        width: 60,
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        marginLeft: 8,
    },
    scrollContent: {
        paddingVertical: ITEM_HEIGHT * 2,
    },
    itemWrapper: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 18,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    selectedItemText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
    },
    divider: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginHorizontal: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#9d1e30',
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    confirmButtonTextDisabled: {
        color: '#6B7280',
    },
    validationText: {
        marginTop: 8,
        paddingHorizontal: 16,
        fontSize: 12,
        color: '#B91C1C',
    },
});
