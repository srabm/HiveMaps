import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { haversineKM } from '@/services/maps/route-validator';
import type { POI } from '@/components/ui/POICategory'; 

interface OutdoorPOICardProps {
    poi: POI | null;
    userLocation: { latitude: number; longitude: number } | null;
    onClose: () => void;
    onGetDirections: () => void;
}

export function OutdoorPOICard({ 
    poi, 
    userLocation, 
    onClose, 
    onGetDirections
}: Readonly<OutdoorPOICardProps>) {

    if (!poi) return null;

    let distanceText = '';
    if (userLocation) {
        const distKM = haversineKM(
            userLocation.longitude, userLocation.latitude,
            poi.coordinates.longitude, poi.coordinates.latitude
        );
        if (distKM < 1) {
            distanceText = `${Math.round(distKM * 1000)}m`;
        } else {
            distanceText = `${distKM.toFixed(1)}km`;
        }
    }

    const burgundy = '#9d1e30';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>{poi.name}</Text>
                    <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12} testID="poi-card-close">
                        <Ionicons name="close" size={20} color="#6B7280" />
                    </Pressable>
                </View>

                <Text style={styles.address} numberOfLines={1}>{poi.full_address}</Text>
                
                <View style={styles.bottomMetaRow}>
                    {distanceText ? (
                        <View style={styles.metaBadge}>
                            <MaterialIcons name="directions-walk" size={18} color={burgundy} />
                            <Text style={styles.distanceText}>{distanceText}</Text>
                        </View>
                    ) : null}

                    {poi.phone && (
                        <View style={styles.metaBadge}>
                            <MaterialIcons name="phone" size={18} color="#9d1e30" />
                            <Text style={styles.phoneText}>{poi.phone}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.actionRow}>
                <Pressable 
                    style={[styles.actionBtn, styles.primaryBtn]} 
                    onPress={onGetDirections}
                >
                    <MaterialIcons name="directions" size={14} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>Directions</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 120,
        left: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 50,
    },
    header: {
        marginBottom: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
        marginRight: 8,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
    },
    address: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    bottomMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9d1e30',
        marginLeft: 4,
    },
    phoneText: {
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 4,
    },
    
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
    },
    primaryBtn: {
        backgroundColor: '#9d1e30',
        borderColor: '#9d1e30',
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
});