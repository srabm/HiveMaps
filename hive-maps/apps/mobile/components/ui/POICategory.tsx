import React, { useState,useEffect } from 'react';
import {ScrollView, TouchableOpacity, Text, StyleSheet, View,} from 'react-native';
import {mapboxMapsAdapter} from "@/services/mapbox";

export type POI = {
    name: string;
    full_address: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    phone?: string;
};

type Category = {
    id: string;
    label: string;
};

type POICategoryChipsProps = {
    userLocation: [number, number] | null;
    radius?: number | null;
    onSelectCategory?: (category: string, pois: POI[]) => void;
    onClearCategory?: () => void;
    marginTop?: number;
};


const CATEGORIES: Category[] = [
    { id: 'restaurant',  label: 'Restaurants' },
    { id: 'coffee',      label: 'Coffee Shops'},
    { id: 'pharmacy',    label: 'Pharmacy'},
];
export function POICategory({
                                userLocation,
                                radius,
                                onSelectCategory,
                                onClearCategory,
                                marginTop,
                            }: Readonly<POICategoryChipsProps>) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [minLat,setMinLat] = useState<number>(0);
    const [maxLat,setMaxLat] = useState<number>(0);
    const [minLon,setMinLon] = useState<number>(0);
    const [maxLon,setMaxLon] = useState<number>(0);

    useEffect(() => {
        if (!userLocation ) return;
        const getBoundaries = (coordinates:[number, number] , distanceFromCenterToTheBorder:number)=> {

            const lon = coordinates[0];
            const lat = coordinates[1]
            const latRad = lat  * (Math.PI / 180);

            const deltaLat = distanceFromCenterToTheBorder / 111;
            const deltaLon = distanceFromCenterToTheBorder / (111 * Math.cos(latRad));
            setMinLon(lon - deltaLon);
            setMinLat(lat - deltaLat);
            setMaxLon(lon + deltaLon);
            setMaxLat(lat + deltaLat);
        }

        getBoundaries(userLocation ,0.8);
    }, [userLocation]);


    const handlePress = async (category: Category) => {
        console.log("pressed: " + category.id);
        console.log(category)
        console.log(minLat);
        console.log(userLocation);
        console.log(radius);
        if (activeCategory === category.id) {
            handleClearActive();
            return;
        }

        try{
            if (!userLocation ) return;
            const pois:POI[] | null = await mapboxMapsAdapter.categorySearch(category.id,userLocation,minLat,minLon,maxLat,maxLon);
            if(!pois)return;
            setActiveCategory(category.id);
            onSelectCategory?.(category.id, pois);
            console.log(pois);
        }
        catch(error){
            console.error("Fetching points of interest failed: ",error);
        }
    }
    const handleClearActive = () => {
        setActiveCategory(null);
        onClearCategory?.();
    };

    return (
        <View style={[styles.wrapper, { marginTop: marginTop ?? 65 }]} pointerEvents="box-none">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {activeCategory && (
                    <TouchableOpacity
                        key="clear"
                        style={styles.chipClear}
                        onPress={handleClearActive}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.chipClearLabel}>✕</Text>
                    </TouchableOpacity>
                )}
                {CATEGORIES.map((category) => {
                    const isActive = activeCategory === category.id;
                    return (
                        <TouchableOpacity
                            key={category.id}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => handlePress(category)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                                {category.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingLeft: 12,
    },
    scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 16,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 13,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    chipActive: {
        backgroundColor: '#9d1e30',
    },
    chipIconWrapper: {
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipIcon: {
        fontSize: 13,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    chipLabelActive: {
        color: '#ffffff',
    },
    chipClear: {
        paddingVertical: 7,
        paddingHorizontal: 13,
        borderRadius: 20,
        backgroundColor: '#9d1e30',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    chipClearLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
});