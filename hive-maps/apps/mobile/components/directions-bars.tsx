import React, { useState, useRef, useEffect } from "react";
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Text,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Coordinates, MapLocation, MapsProviderPort } from "@/services/maps/maps-provider";

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
    fromPlaceholder?: string
    toPlaceholder?: string
}

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
                                                       fromPlaceholder = 'Choose starting point',
                                                       toPlaceholder = 'Choose destination'
                                                   }) => {
    const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
    const [fromSuggestions, setFromSuggestions] = useState<MapLocation[]>([]);
    const [toSuggestions, setToSuggestions] = useState<MapLocation[]>([]);
    const sessionToken = useRef(Date.now().toString());

    const generateNewSessionToken = () => {
        sessionToken.current = Date.now().toString();
    };
    const fetchCoordinates = async (id: string) => {
        const coords = await mapsAdapter?.retrieve(id, sessionToken.current) ?? null;
        generateNewSessionToken();
        return coords;
    }

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
                renderItem={({ item }) => (
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
                )}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.inputs}>
                    {/* From a particular direction (starting direction)*/}
                    <View>
                        <View style={styles.inputRow}>
                            <TouchableOpacity testID="reset-button" onPress={onResetFrom}>
                                <Image
                                    source={require("../assets/images/bee.png")}
                                    style={styles.beeIcon}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                            <TextInput
                                value={fromValue}
                                placeholder={fromPlaceholder}
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

                    {/* To a particular direction (Finishing directions) */}
                    <View>
                        <View style={styles.inputRow}>
                            <Ionicons name="navigate-outline" size={20} color="#000" />
                            <TextInput
                                value={toValue}
                                placeholder={toPlaceholder}
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

                <View style={styles.controls}>
                    <TouchableOpacity testID="close-button" onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>

                    <TouchableOpacity testID="swap-button" onPress={onSwap} style={styles.swapButton}>
                        <Ionicons name="swap-vertical" size={22} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default DirectionBar;


const styles = StyleSheet.create({
    container: {
        backgroundColor: "rgba(157, 30, 48, 0.86)",
        borderRadius: 12,
        padding: 8,
        width: "97%",
        alignSelf: "center",
    },
    content: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 8,
    },
    inputs: {
        flex: 1,
        gap: 6,
    },
    inputRow: {
        backgroundColor: "#fff",
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 7,
        paddingVertical: 4,
        minHeight: 48,
    },
    beeIcon: {
        width: 28,
        height: 28,
    },
    input: {
        flex: 1,
        marginHorizontal: 5,
        fontSize: 12,
    },
    controls: {
        width: 42,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    closeButton: {
        position: "absolute",
        top: 0,
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    swapButton: {
        backgroundColor: "#FFD180",
        width: 36,
        height: 36,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
    },
    suggestions: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginTop: 4,
        elevation: 4,
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#ddd",
    },
    suggestionTitle: {
        fontWeight: "600",
    },
    suggestionSubtitle: {
        fontSize: 12,
        color: "#666",
    },
});
