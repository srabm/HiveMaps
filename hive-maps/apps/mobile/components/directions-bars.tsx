import React, { useMemo, useState } from "react";
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
import { buildings } from "@/constants/campus";

interface DirectionBarProps {
    fromValue: string;
    toValue: string;
    onChangeFrom: (text: string) => void;
    onChangeTo: (text: string) => void;
    onSwap?: () => void;
    onClearFrom?: () => void;
    onClearTo?: () => void;
    onClose?: () => void;
}

const DirectionBar: React.FC<DirectionBarProps> = ({
                                                       fromValue,
                                                       toValue,
                                                       onChangeFrom,
                                                       onChangeTo,
                                                       onSwap,
                                                       onClearFrom,
                                                       onClearTo,
                                                       onClose,
                                                   }) => {
    const [activeField, setActiveField] = useState<"from" | "to" | null>(null);

    const filterBuildings = (query: string) => {
        if (!query.trim()) return [];

        const q = query.toLowerCase();
        return buildings.filter((b) =>
            [b.code, b.name, ...b.addresses]
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    };

    const fromSuggestions = useMemo(
        () => (activeField === "from" ? filterBuildings(fromValue) : []),
        [fromValue, activeField]
    );

    const toSuggestions = useMemo(
        () => (activeField === "to" ? filterBuildings(toValue) : []),
        [toValue, activeField]
    );

    const renderSuggestions = (
        data: typeof buildings,
        onSelect: (name: string) => void
    ) => (
        <View style={styles.suggestions}>
            <FlatList
                keyboardShouldPersistTaps="handled"
                data={data.slice(0, 6)}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.suggestionItem}
                        onPress={() => {
                            onSelect(item.name + "," + item.addresses);
                            setActiveField(null);
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
    );

    return (
        <View style={styles.container}>

            <View style={styles.inputs}>
                {/* From a particular direction (starting direction)*/}
                <View>
                    <View style={styles.inputRow}>
                        <Image
                            source={require("../assets/images/bee.png")}
                            style={{ width: 40, height: 40 }}
                            resizeMode="contain"
                        />
                        <TextInput
                            value={fromValue}
                            placeholder="Your location"
                            style={styles.input}
                            onFocus={() => setActiveField("from")}
                            onChangeText={onChangeFrom}
                        />
                        <TouchableOpacity onPress={onClearFrom}>
                            <Ionicons name="close" size={20} />
                        </TouchableOpacity>
                    </View>

                    {fromSuggestions.length > 0 &&
                        renderSuggestions(fromSuggestions, onChangeFrom)}
                </View>

                {/* To a particular direction (Finishing directions) */}
                <View>
                    <View style={styles.inputRow}>
                        <Ionicons name="navigate-outline" size={20} color="#000" />
                        <TextInput
                            value={toValue}
                            placeholder="Destination"
                            style={styles.input}
                            onFocus={() => setActiveField("to")}
                            onChangeText={onChangeTo}
                        />
                        <TouchableOpacity onPress={onClearTo}>
                            <Ionicons name="close" size={20} />
                        </TouchableOpacity>
                    </View>

                    {toSuggestions.length > 0 &&
                        renderSuggestions(toSuggestions, onChangeTo)}
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
