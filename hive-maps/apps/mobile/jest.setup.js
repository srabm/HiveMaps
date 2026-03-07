// Set backend URL for integration tests running on host machine
// This must be set BEFORE modules are imported
if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080';
}

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
