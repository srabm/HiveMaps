import React, { useState, useRef, useEffect } from "react";
import {View, TextInput, StyleSheet, TouchableOpacity, Platform, FlatList, Text,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Coordinates, MapLocation, MapsProviderPort } from "@/services/maps/maps-provider";

interface MapSearchBarProps {
    mapsAdapter?: MapsProviderPort;
    toValue: string;
    placeholder?: string;
    onChangeText?: (text: string) => void;
    onSelectBuilding?: (mapLocation: MapLocation, coordinates: Coordinates | null) => void;
    onClickButton?: () => void;
    onClear?: () => void;
}

const MapSearchBar: React.FC<MapSearchBarProps> = ({mapsAdapter,toValue,placeholder = "Search building or address",onChangeText,onSelectBuilding,onClickButton,onClear}) => {
    const [listAppearance, setListAppearance] = useState<boolean>(true);
    const [suggestions, setSuggestions] = useState<MapLocation[]>([]);
    const sessionToken = useRef(Date.now().toString());

    const handleChange = (text: string) => {
        onChangeText?.(text);
        setListAppearance(true);
    };
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
            if (toValue.trim() === '') {
                setSuggestions([]);
                return;
            }
            try {
                const res = await mapsAdapter?.search(toValue, null, sessionToken.current);
                setSuggestions(res ?? []);
            }
            catch {
                setSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [toValue, mapsAdapter]);

    return (
        <View style={styles.container}>
            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#555" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#888"
                    value={toValue}
                    onChangeText={handleChange}
                    returnKeyType="search"
                />
                {toValue.length > 0 && (
                    <TouchableOpacity testID='close-button' onPress={() => {
                        setListAppearance(false);
                        onClear?.();
                    }}>
                        <Ionicons name="close-circle"  size={20} color="#555" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    testID='navigate-button'
                    style={styles.circleButton}
                    onPress={onClickButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="navigate" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {listAppearance && suggestions.length > 0 && ( // Creates a potential list of concordia campus buildings to choose from (Acts as autocomplete)
                <View style={styles.suggestions}>
                    <FlatList
                        keyboardShouldPersistTaps="handled"
                        data={suggestions.slice(0, 10)}
                        keyExtractor={(item) => `${item.id}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={async () => {
                                    onSelectBuilding?.(item, await fetchCoordinates(item.id));
                                    setListAppearance(false);
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
            )}
        </View>
    );
};

export default MapSearchBar;

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: Platform.OS === "ios" ? 50 : 20,
        left: 10,
        right: 10,
        zIndex: 1000,
    },
    searchBox: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 10,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5, // Android shadow
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: "#000",
    },
    suggestions: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginTop: 6,
        maxHeight: 250,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },

    suggestionItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#ddd",
    },

    suggestionTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#000",
    },

    suggestionSubtitle: {
        fontSize: 13,
        color: "#666",
    },
    circleButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2563eb', // blue
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },

});
