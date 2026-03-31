import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {StyleSheet, View} from 'react-native';

export function DestinationPin() {
    return (
        <View style={styles.destinationPin}>
            <MaterialIcons name="location-on" size={42} color="#7b1222" />
            <MaterialIcons name="location-on" size={38} color="#ffffff" style={styles.destinationPinInner} />
            <MaterialIcons name="location-on" size={34} color="#EA4335" style={styles.destinationPinInner} />
        </View>
    );
}

const styles = StyleSheet.create({
    destinationPin: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    destinationPinInner: {
        position: 'absolute',
    },
});
