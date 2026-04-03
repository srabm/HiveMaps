import {Pressable, StyleSheet, View} from 'react-native';
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';
import {Colors, Fonts} from '@/constants/theme';
import {useColorScheme} from '@/hooks/use-color-scheme';

type NextClassPromptProps = {
    body: string;
    title?: string;
    onDismiss: () => void;
    onStartDirections: () => void;
};

export function NextClassPrompt({
    body,
    title = 'Your next class is coming up!',
    onDismiss,
    onStartDirections,
}: Readonly<NextClassPromptProps>) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View pointerEvents='box-none' style={styles.container}>
            <ThemedView style={[styles.card, {backgroundColor: theme.background}]}>
                <ThemedText style={styles.title}>{title}</ThemedText>
                <ThemedText style={styles.body}>{body}</ThemedText>

                <Pressable
                    accessibilityRole='button'
                    onPress={onStartDirections}
                    style={styles.primaryButton}
                    testID='next-class-start-directions'
                >
                    <ThemedText style={styles.primaryButtonText}>Start Directions</ThemedText>
                </Pressable>

                <Pressable
                    accessibilityRole='button'
                    onPress={onDismiss}
                    style={styles.secondaryButton}
                    testID='next-class-dismiss'
                >
                    <ThemedText style={styles.secondaryButtonText}>Dismiss</ThemedText>
                </Pressable>
            </ThemedView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        left: 16,
        position: 'absolute',
        right: 16,
        top: '30%',
        zIndex: 20,
    },
    card: {
        borderRadius: 24,
        elevation: 12,
        paddingHorizontal: 22,
        paddingVertical: 18,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.18,
        shadowRadius: 16,

    },
    title: {
        fontFamily: Fonts.rounded,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 18,
        textAlign: 'center',
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 24,
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: '#912338',
        borderRadius: 14,
        marginBottom: 12,
        paddingVertical: 14,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: '#5b5b5b',
        borderRadius: 14,
        paddingVertical: 14,
    },
    secondaryButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
});
