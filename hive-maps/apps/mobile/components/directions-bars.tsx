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

            <View style={styles.inputs}>
                {/* From a particular direction (starting direction)*/}
                <View>
                    <View style={styles.inputRow}>
                        <TouchableOpacity onPress={onResetFrom}>
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
                        <TouchableOpacity onPress={onClearFrom}>
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
                            placeholder="Choose destination"
                            style={styles.input}
                            onFocus={() => setActiveField("to")}
                            onChangeText={(text) => {
                                onChangeTo?.(text);
                            }}
                        />
                        <TouchableOpacity onPress={onClearTo}>
                            <Ionicons name="close" size={20} />
                        </TouchableOpacity>
                    </View>

                    {activeField === "to" &&
                        renderSuggestions(toSuggestions, onSelectTo)}
                </View>
            </View>

            {/* Actions such as swapping the directions and closing the directions bars*/}
            <View style={styles.actions}>
                <TouchableOpacity onPress={onSwap} style={styles.actionButton}>
                    <Ionicons name="swap-vertical" size={22} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.actionButton}>
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
