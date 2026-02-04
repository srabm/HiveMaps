import React, { useState, useMemo } from "react";
import { buildings } from "@/constants/campus";
import {View, TextInput, StyleSheet, TouchableOpacity, Platform, FlatList, Text,} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MapSearchBarProps {
    placeholder?: string;
    onChangeText?: (text: string) => void;
    onSelectBuilding?: (building: (typeof buildings)[number]) => void;
    onClickButton?: () => void;
}

const MapSearchBar: React.FC<MapSearchBarProps> = ({placeholder = "Search building or address",onChangeText,onSelectBuilding,onClickButton,}) => {
    const [query, setQuery] = useState("");

    const handleChange = (text: string) => {
        setQuery(text);
        onChangeText?.(text);
        setlistAppearance(true);
    };
    const [listAppearance, setlistAppearance] = useState<Boolean>(true);
    const clearQuery = () => setQuery("");

    const suggestions = useMemo(() => {
        if (!query.trim()) return [];

        const q = query.toLowerCase();

        return buildings.filter((b) => {
            const searchableText = [
                b.code,
                b.name,
                ...b.addresses,
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(q);
        });
    }, [query]);

    return (
        <View style={styles.container}>
            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#555" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#888"
                    value={query}
                    onChangeText={handleChange}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => {
                        setlistAppearance(false);
                        clearQuery();
                    }}>
                        <Ionicons name="close-circle"  size={20} color="#555" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
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
                        keyExtractor={(item) => `${item.campus}-${item.code}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => {
                                    setQuery(item.name);
                                    onSelectBuilding?.(item);
                                    setlistAppearance(false);
                                }}
                            >
                                <Text style={styles.suggestionTitle}>
                                    {item.code} — {item.name}
                                </Text>
                                <Text style={styles.suggestionSubtitle}>
                                    {item.addresses[0]}
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
