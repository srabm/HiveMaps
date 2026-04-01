import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { Dimensions, PanResponder, StyleSheet } from 'react-native';
import DirectionsModal, { DirectionsModalProps } from '@/components/indoor/indoor-directions-modal';
import type { IndoorDirectionsResponse, IndoorNodeResponse, DirectionType } from '@/services/http/indoor-api';

jest.mock('@/assets/images/bee.png', () => 'bee-image');
jest.mock('@/assets/images/straight.png', () => 'straight-image');
jest.mock('@/assets/images/turn-left.png', () => 'turn-left-image');
jest.mock('@/assets/images/turn-right.png', () => 'turn-right-image');

const makeNode = (id: string, floor = '8', building = 'H'): IndoorNodeResponse => ({
    id,
    label: id,
    wheelchairAccessible: false,
    floor,
    building,
    longitude: -73.5798,
    latitude: 45.4902,
});

const makeStep = (
    description: string,
    direction: DirectionType = "STRAIGHT",
    distance = 10,
    nodes?: IndoorNodeResponse[],
): IndoorDirectionsResponse => ({
    description,
    direction,
    distance,
    nodes: nodes ?? [makeNode(`node-${description}`)],
});

const defaultSteps: IndoorDirectionsResponse[] = [
    makeStep('Walk straight', 'STRAIGHT', 10, [makeNode('node-1')]),
    makeStep('Turn left',     'LEFT',     5,  [makeNode('node-2')]),
    makeStep('Turn right',    'RIGHT',    8,  [makeNode('node-3')]),
];

const renderModal = (overrides: Partial<DirectionsModalProps> = {}) =>
    render(
        <DirectionsModal
            visible={true}
            steps={defaultSteps}
            origin="Room A"
            destination="Room B"
            onClose={jest.fn()}
            {...overrides}
        />,
    );

const getSheetHeightFromHandle = (handle: any): number | undefined => {
    let current = handle;
    while (current) {
        const flattened = StyleSheet.flatten(current.props?.style);
        if (typeof flattened?.height === 'number') {
            return flattened.height;
        }
        current = current.parent;
    }
    return undefined;
};

describe('DirectionsModal', () => {

    it('shows the pre-start screen before the user presses Start', () => {
        const {getByText} = renderModal();
        expect(getByText('Walk')).toBeTruthy();
        expect(getByText('Start')).toBeTruthy();
    });

    it('shows destination label on the pre-start screen', () => {
        const {getByText} = renderModal({destination: 'Lab 101'});
        expect(getByText('Arrive at Lab 101')).toBeTruthy();
    });

    it('falls back to the last node id when destination is not provided', () => {
        const { getByText } = renderModal({ destination: undefined });
        expect(getByText('Arrive at node-3')).toBeTruthy();
    });

    it('falls back to "Destination" when no steps are available and destination is not provided', () => {
        const { getByText } = renderModal({ steps: [], destination: undefined });
        expect(getByText('Arrive at Destination')).toBeTruthy();
    });

    it('configures the pan responder to capture start and move gestures', () => {
        const panResponderSpy = jest.spyOn(PanResponder, 'create');
        renderModal();

        expect(panResponderSpy).toHaveBeenCalled();
        const handlers = panResponderSpy.mock.calls[0][0] as any;
        expect(handlers.onStartShouldSetPanResponder()).toBe(true);
        expect(handlers.onMoveShouldSetPanResponder()).toBe(true);

        panResponderSpy.mockRestore();
    });

    it('updates and clamps sheet height while dragging the pre-start handle', () => {
        const panResponderSpy = jest.spyOn(PanResponder, 'create');
        const { getByTestId } = renderModal();

        const handlers = panResponderSpy.mock.calls[0][0] as any;
        const screenHeight = Dimensions.get('window').height;
        const minHeight = screenHeight * 0.3;
        const maxHeight = screenHeight * 0.85;
        const getHeight = () => getSheetHeightFromHandle(getByTestId('drag-handle'));

        act(() => {
            handlers.onPanResponderGrant();
            handlers.onPanResponderMove({}, { dy: 9999 });
        });
        expect(getHeight()).toBeCloseTo(minHeight, 3);

        act(() => {
            handlers.onPanResponderGrant();
            handlers.onPanResponderMove({}, { dy: -9999 });
        });
        expect(getHeight()).toBeCloseTo(maxHeight, 3);

        panResponderSpy.mockRestore();
    });

    it('shows total distance (sum of all steps) on pre-start screen', () => {
        // defaultSteps distances: 10 + 5 + 8 = 23 m (plus the appended arrival step of 0 m)
        const {getByText} = renderModal();
        expect(getByText('23 m')).toBeTruthy();
    });

    it('transitions to the navigation view when Start is pressed', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        expect(getByText('Room B')).toBeTruthy();
    });

    it('shows step counter after starting', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        // defaultSteps (3) + 1 appended arrival step = 4 total
        expect(getByText(/Step 1 of 4/)).toBeTruthy();
    });

    it('shows the next-step preview in the compact started layout', () => {
        const { getByText } = renderModal({ origin: 'Lobby' });
        fireEvent.press(getByText('Start'));
        expect(getByText('Then: Turn left 5.00m')).toBeTruthy();
    });

    it('shows the first step description', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        expect(getByText('Walk straight')).toBeTruthy();
    });

    it('shows floor and building for the current step', () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        expect(getByText('Floor 8 - H')).toBeTruthy();
    });

    it('shows destination label in the header after starting', () => {
        const {getByText} = renderModal({destination: 'Lab 101'});
        fireEvent.press(getByText('Start'));
        expect(getByText('Lab 101')).toBeTruthy();
    });

    it('Back button is disabled on the first step', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        const backBtn = getByText('Back').parent?.parent;
        expect(backBtn?.props.accessibilityState?.disabled ?? backBtn?.props.disabled).toBeTruthy();
    });

    it('shows updated step description after pressing Next', async () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => {
            expect(getByText(/Step 2 of 4/)).toBeTruthy();
            expect(getByText('Then: Turn right 8.00m')).toBeTruthy();
        });
    });

    it('goes back to the previous step when Back is pressed', async () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        await act(async () => { fireEvent.press(getByText('Next')); });
        fireEvent.press(getByText('Back'));
        expect(getByText(/Step 1 of 4/)).toBeTruthy();
    });

    it('collapses expanded steps when Back is pressed', async () => {
        const { getByText, queryByText } = renderModal();
        fireEvent.press(getByText('Start'));
        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => {
            expect(getByText(/Step 2 of 4/)).toBeTruthy();
            expect(getByText('Then: Turn right 8.00m')).toBeTruthy();
        });

        fireEvent.press(getByText('Then: Turn right 8.00m'));
        expect(getByText('Turn right')).toBeTruthy();

        fireEvent.press(getByText('Back'));
        await waitFor(() => {
            expect(getByText(/Step 1 of 4/)).toBeTruthy();
            expect(queryByText('Turn right')).toBeNull();
        });
    });

    it('calls onCurrentNodeChange with the previous node when going back', async () => {
        const onCurrentNodeChange = jest.fn();
        const steps = [
            makeStep('Step 1', 'STRAIGHT', 5, [makeNode('node-1')]),
            makeStep('Step 2', 'LEFT', 5, [makeNode('node-2')]),
        ];
        const { getByText } = renderModal({ steps, onCurrentNodeChange });

        fireEvent.press(getByText('Start'));
        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => {
            expect(onCurrentNodeChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-2' }));
        });

        await act(async () => { fireEvent.press(getByText('Back')); });
        await waitFor(() => {
            expect(onCurrentNodeChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-1' }));
        });
    });

    it('expands remaining steps when the Then row is pressed', () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        fireEvent.press(getByText('Then: Turn left 5.00m'));
        expect(getByText('Turn left')).toBeTruthy();
        expect(getByText('Turn right')).toBeTruthy();
    });

    it('shows arrival text when there is no next step before arriving', async () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        await act(async () => { fireEvent.press(getByText('Next')); });
        await act(async () => { fireEvent.press(getByText('Next')); });
        await act(async () => { fireEvent.press(getByText('Next')); });
        expect(getByText('Then: You have arrived at your destination')).toBeTruthy();
    });

    it('switches to arrived state when Arrived is pressed', async () => {
        const { getByText, queryByText } = renderModal();
        fireEvent.press(getByText('Start'));
        await act(async () => { fireEvent.press(getByText('Next')); });
        await act(async () => { fireEvent.press(getByText('Next')); });
        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => {
            expect(getByText('Arrived')).toBeTruthy();
        });

        await act(async () => {
            fireEvent.press(getByText('Arrived'));
        });

        expect(getByText('You have arrived!')).toBeTruthy();
        expect(getByText('End')).toBeTruthy();
        expect(queryByText('arrival')).toBeNull();
        expect(queryByText('remain')).toBeNull();
        expect(queryByText('min')).toBeNull();
    });

    it('calls onClose when End is pressed after starting', () => {
        const onClose = jest.fn();
        const { getByText } = renderModal({ onClose });
        fireEvent.press(getByText('Start'));
        fireEvent.press(getByText('End'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onCurrentNodeChange before Start is pressed', () => {
        const onCurrentNodeChange = jest.fn();
        const steps = [makeStep('Go straight', 'STRAIGHT', 5, [makeNode('start-node')])];
        renderModal({steps, onCurrentNodeChange});
        expect(onCurrentNodeChange).not.toHaveBeenCalled();
    });

    it('calls onCurrentNodeChange with the first node when Start is pressed', async () => {
        const onCurrentNodeChange = jest.fn();
        const steps = [makeStep('Go straight', 'STRAIGHT', 5, [makeNode('start-node')])];
        const {getByText} = renderModal({steps, onCurrentNodeChange});

        fireEvent.press(getByText('Start'));

        await waitFor(() => {
            expect(onCurrentNodeChange).toHaveBeenCalledWith(expect.objectContaining({id: 'start-node'}));
        });
    });

    it('calls onCurrentNodeChange with the next step node when advancing', async () => {
        const onCurrentNodeChange = jest.fn();
        const steps = [
            makeStep('Step 1', 'STRAIGHT', 5, [makeNode('node-1')]),
            makeStep('Step 2', 'LEFT',     5, [makeNode('node-2')]),
        ];
        const {getByText} = renderModal({steps, onCurrentNodeChange});
        fireEvent.press(getByText('Start'));

        await act(async () => {
            fireEvent.press(getByText('Next'));
        });

        await waitFor(() => {
            expect(onCurrentNodeChange).toHaveBeenCalledWith(expect.objectContaining({id: 'node-2'}));
        });
    });

    it('does not call onCurrentNodeChange when visible is false', () => {
        const onCurrentNodeChange = jest.fn();
        renderModal({visible: false, onCurrentNodeChange});
        expect(onCurrentNodeChange).not.toHaveBeenCalled();
    });

    it('does not crash when onCurrentNodeChange is not provided', () => {
        expect(() => renderModal({onCurrentNodeChange: undefined})).not.toThrow();
    });

    it('renders without crashing when steps array is empty', () => {
        expect(() => renderModal({ steps: [] })).not.toThrow();
    });
});
