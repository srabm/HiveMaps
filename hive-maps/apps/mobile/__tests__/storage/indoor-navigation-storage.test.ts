import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAccessibleState, saveAccessibleState } from '@/storage/indoor-navigation-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('loadAccessibleState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true when stored value is "true"', async () => {
        mockGetItem.mockResolvedValue('true');
        expect(await loadAccessibleState()).toBe(true);
    });

    it('returns false when stored value is "false"', async () => {
        mockGetItem.mockResolvedValue('false');
        expect(await loadAccessibleState()).toBe(false);
    });

    it('returns false when no value is stored', async () => {
        mockGetItem.mockResolvedValue(null);
        expect(await loadAccessibleState()).toBe(false);
    });

    it('returns false when AsyncStorage throws', async () => {
        mockGetItem.mockRejectedValue(new Error('Storage error'));
        expect(await loadAccessibleState()).toBe(false);
    });

    it('reads from the correct key', async () => {
        mockGetItem.mockResolvedValue(null);
        await loadAccessibleState();
        expect(mockGetItem).toHaveBeenCalledWith('settings.accessible');
    });
});

describe('saveAccessibleState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('saves "true" when accessible is true', async () => {
        mockSetItem.mockResolvedValue(undefined);
        await saveAccessibleState(true);
        expect(mockSetItem).toHaveBeenCalledWith('settings.accessible', 'true');
    });

    it('saves "false" when accessible is false', async () => {
        mockSetItem.mockResolvedValue(undefined);
        await saveAccessibleState(false);
        expect(mockSetItem).toHaveBeenCalledWith('settings.accessible', 'false');
    });

    it('does not throw when AsyncStorage throws', async () => {
        mockSetItem.mockRejectedValue(new Error('Storage error'));
        await expect(saveAccessibleState(true)).resolves.not.toThrow();
    });

    it('writes to the correct key', async () => {
        mockSetItem.mockResolvedValue(undefined);
        await saveAccessibleState(true);
        expect(mockSetItem).toHaveBeenCalledWith('settings.accessible', expect.any(String));
    });
});