import React, { useState, useRef, useEffect } from "react";
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Text,
} from "react-native";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import type { Coordinates, MapLocation, MapsProviderPort } from "@/services/maps/maps-provider";
import { SUPPORTED_INDOOR_BUILDINGS } from "@/services/http/indoor-api";
import { buildings } from "@/constants/campus";

interface DirectionBarProps {
    mapsAdapter?: MapsProviderPort;
    fromValue: string;
    toValue: string;
    onChangeFrom: (text: string) => void;
    onChangeTo: (text: string) => void;
    onSelectFrom: (mapLocation: MapLocation, coordinates: Coordinates | null) => void;
    onSelectTo: (mapLocation: MapLocation, coordinates: Coordinates | null) => void;
    onSwap?: () => void;
    onClearFrom?: () => void;
    onClearTo?: () => void;
    onResetFrom: () => void;
    onClose?: () => void;
}
const getIndoorBuildingCode = (item: MapLocation): string | null => {
    if (SUPPORTED_INDOOR_BUILDINGS.has(item.id)) {
        return item.id;
    }

    const resultName = item.name.toLowerCase();
    const resultAddress = item.address?.toLowerCase() || '';

    for (const b of buildings) {
        if (!SUPPORTED_INDOOR_BUILDINGS.has(b.code)) continue;

        const dbAddress = b.addresses[0].toLowerCase();
        const dbName = b.name.toLowerCase();

        if (dbAddress.includes('7141 sherbrooke')) {
            if (resultName.includes(dbName)) return b.code;
            if (b.code === 'VL' && resultName.includes('vanier library')) return 'VL';
            if (b.code === 'VE' && resultName.includes('vanier extension')) return 'VE';
            if (b.code === 'CC' && resultName.includes('central')) return 'CC';
        } else {

            const streetPart = dbAddress.split(',')[0].replace(/blvd\.|st\.|w\.|ouest/g, '').trim();
            
            if (resultAddress.includes(streetPart)) return b.code;

            if (resultName.includes(dbName)) return b.code;
            if (b.code === 'H' && resultName.includes('hall building')) return 'H';
            if (b.code === 'MB' && resultName.includes('john molson')) return 'MB';
            if (b.code === 'LB' && resultName.includes('mcconnell')) return 'LB';
        }
    }

    return null;
};

const DirectionBar: React.FC<DirectionBarProps> = ({
                                                       mapsAdapter,
                                                       fromValue,
                                                       toValue,
                                                       onChangeFrom,
                                                       onChangeTo,
                                                       onSelectFrom,
                                                       onSelectTo,
                                                       onSwap,
                                                       onClearFrom,
                                                       onClearTo,
                                                       onResetFrom,
                                                       onClose,
                                                   }) => {
    const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
    const [fromSuggestions, setFromSuggestions] = useState<MapLocation[]>([]);
    const [toSuggestions, setToSuggestions] = useState<MapLocation[]>([]);
    const sessionToken = useRef(Date.now().toString());
    const router = useRouter();

    const generateNewSessionToken = () => {
        sessionToken.current = Date.now().toString();
    };
    
    const fetchCoordinates = async (id: string) => {
        const coords = await mapsAdapter?.retrieve(id, sessionToken.current) ?? null;
        generateNewSessionToken();
        return coords;
    };

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (fromValue.trim() === '') {
                setFromSuggestions([]);
                return;
            }
            try {
                const res = await mapsAdapter?.search(fromValue, null, sessionToken.current);
                setFromSuggestions(res ?? []);
            }
            catch {
                setFromSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [fromValue, mapsAdapter]);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (toValue.trim() === '') {
                setToSuggestions([]);
                return;
            }
            try {
                const res = await mapsAdapter?.search(toValue, null, sessionToken.current);
                setToSuggestions(res ?? []);
            }
            catch {
                setToSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [toValue, mapsAdapter]);

    const renderSuggestions = (
        data: MapLocation[],
        onSelect: (mapLocation: MapLocation, coordinates: Coordinates | null) => void
    ) => (
        <View style={styles.suggestions}>
            <FlatList
                keyboardShouldPersistTaps="handled"
                data={data.slice(0, 6)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const indoorCode = getIndoorBuildingCode(item);

                    return (
                        <View style={styles.suggestionItemContainer}>
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={async () => {
                                    onSelect(item, await fetchCoordinates(item.id));
                                    setActiveField(null);
                                }}
                            >
                                <Text style={styles.suggestionTitle}>
                                    {item.name}
                                </Text>
                                <Text style={styles.suggestionSubtitle}>
                                    {item.address}
                                </Text>
                            </TouchableOpacity>

                            {indoorCode && SUPPORTED_INDOOR_BUILDINGS.has(indoorCode) && (
                                <TouchableOpacity 
                                    style={styles.indoorButton}
                                    onPress={() => router.push(`/indoor/${indoorCode}` as Href)}
                                >
                                    <Ionicons name="map-outline" size={16} color="#fff" />
                                    <Text style={styles.indoorButtonText}>Indoor</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                }}
            />
        </View>
    );

    return (
        <View style={styles.container}>

            <View style={styles.inputs}>
                <View>
                    <View style={styles.inputRow}>
                        <TouchableOpacity testID="reset-button" onPress={onResetFrom}>
                            <Image
                                source={require("../assets/images/bee.png")}
                                style={{ width: 40, height: 40 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TextInput
                            value={fromValue}
                            placeholder="Choose starting point"
                            style={styles.input}
                            onFocus={() => setActiveField("from")}
                            onChangeText={(text) => {
                                onChangeFrom?.(text);
                            }}
                        />
                        <TouchableOpacity testID="clear-from" onPress={onClearFrom}>
                            <Ionicons name="close" size={20} />
                        </TouchableOpacity>
                    </View>

                    {activeField === "from" &&
                        renderSuggestions(fromSuggestions, onSelectFrom)}
                </View>

                <View>
                    <View style={styles.inputRow}>
                        <Ionicons name="navigate-outline" size={20} color="#000" />
                        <TextInput
                            value={toValue}
                            placeholder="Choose destination"
                            style={styles.input}
                            onFocus={() => setActiveField("to")}
                            onChangeText={(text) => {
                                onChangeTo?.(text);
                            }}
                        />
                        <TouchableOpacity testID="clear-to" onPress={onClearTo}>
                            <Ionicons name="close" size={20} />
                        </TouchableOpacity>
                    </View>

                    {activeField === "to" &&
                        renderSuggestions(toSuggestions, onSelectTo)}
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity testID="swap-button" onPress={onSwap} style={styles.actionButton}>
                    <Ionicons name="swap-vertical" size={22} />
                </TouchableOpacity>

                <TouchableOpacity testID="close-button" onPress={onClose} style={styles.actionButton}>
                    <Ionicons name="ban-outline" size={22} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default DirectionBar;

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFB74D",
        borderRadius: 16,
        padding: 12,
        width: "99%",
        alignSelf: "center",
        flexDirection: "row",
        gap: 12,
    },
    inputs: {
        flex: 1,
        gap: 8,
    },
    inputRow: {
        backgroundColor: "#fff",
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        marginHorizontal: 8,
        fontSize: 14,
    },
    actions: {
        justifyContent: "center",
    },
    actionButton: {
        backgroundColor: "#FFD180",
        padding: 8,
        borderRadius: 8,
        alignItems: "center",
        marginBottom:10,
    },
    suggestions: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginTop: 4,
        elevation: 4,
    },
    suggestionItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#ddd",
        paddingRight: 10,
    },
    suggestionItem: {
        flex: 1,
        padding: 10,
        borderBottomWidth: 0,
    },
    suggestionTitle: {
        fontWeight: "600",
    },
    suggestionSubtitle: {
        fontSize: 12,
        color: "#666",
    },
    indoorButton: { 
        flexDirection: 'row', 
        backgroundColor: '#9d1e30', 
        paddingHorizontal: 8, 
        paddingVertical: 6, 
        borderRadius: 6, 
        alignItems: 'center', 
        gap: 4 
    },
    indoorButtonText: { 
        color: '#fff', 
        fontSize: 11, 
        fontWeight: '600' 
    }
});