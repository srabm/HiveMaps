import { act, renderHook } from '@testing-library/react-native';
import { useIndoorNavigationState } from '@/state/indoor-navigation-state';
import { loadAccessibleState, saveAccessibleState } from '@/storage/indoor-navigation-storage';

jest.mock('@/storage/indoor-navigation-storage', () => ({
    loadAccessibleState: jest.fn(),
    saveAccessibleState: jest.fn(),
}));

const mockLoadAccessibleState = loadAccessibleState as jest.Mock;
const mockSaveAccessibleState = saveAccessibleState as jest.Mock;

describe('useIndoorNavigationState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('saves accessible state when setAccessible is called', async () => {
        mockLoadAccessibleState.mockResolvedValue(false);
        const { result } = renderHook(() => useIndoorNavigationState());
        await act(async () => {}); // wait for hydration
        await act(async () => { result.current.setAccessible(true); });
        expect(mockSaveAccessibleState).toHaveBeenCalledWith(true);
    });
});