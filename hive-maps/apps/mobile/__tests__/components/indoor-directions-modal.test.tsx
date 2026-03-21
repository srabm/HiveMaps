import React from 'react';
import {render, act, fireEvent, waitFor} from '@testing-library/react-native';
import DirectionsModal, {DirectionsModalProps} from '@/components/indoor/indoor-directions-modal';
import type {IndoorDirectionsResponse, IndoorNodeResponse, DirectionType} from '@/services/http/indoor-api';

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

    it('shows total distance (sum of all steps) on pre-start screen', () => {
        // defaultSteps distances: 10 + 5 + 8 = 23 m (plus the appended arrival step of 0 m)
        const {getByText} = renderModal();
        expect(getByText('23 m')).toBeTruthy();
    });

    it('calls onClose when the ✕ button is pressed on the pre-start screen', () => {
        const onClose = jest.fn();
        const {getAllByText} = renderModal({onClose});
        // The ✕ button appears in pre-start header
        fireEvent.press(getAllByText('✕')[0]);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('transitions to the navigation view when Start is pressed', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        expect(getByText('End Destination: Room B')).toBeTruthy();
    });

    it('shows step counter after starting', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        // defaultSteps (3) + 1 appended arrival step = 4 total
        expect(getByText(/Step 1 of 4/)).toBeTruthy();
    });

    it('shows origin label in the scrollable step list', () => {
        const {getByText} = renderModal({origin: 'Lobby'});
        fireEvent.press(getByText('Start'));
        expect(getByText('Lobby')).toBeTruthy();
    });

    it('shows the first step description', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        expect(getByText('Walk straight')).toBeTruthy();
    });

    it('shows destination label in the header after starting', () => {
        const {getByText} = renderModal({destination: 'Lab 101'});
        fireEvent.press(getByText('Start'));
        expect(getByText(/End Destination: Lab 101/)).toBeTruthy();
    });

    it('Back button is disabled on the first step', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        const backBtn = getByText('Back').parent?.parent;
        expect(backBtn?.props.accessibilityState?.disabled ?? backBtn?.props.disabled).toBeTruthy();
    });

    it('shows updated step description after pressing Next', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        fireEvent.press(getByText('Next'));
        expect(getByText('Turn left')).toBeTruthy();
    });

    it('goes back to the previous step when Back is pressed', () => {
        const {getByText} = renderModal();
        fireEvent.press(getByText('Start'));
        fireEvent.press(getByText('Next'));
        fireEvent.press(getByText('Back'));
        expect(getByText(/Step 1 of 4/)).toBeTruthy();
    });

    it('calls onClose when ✕ is pressed after starting', () => {
        const onClose = jest.fn();
        const {getByText, getAllByText} = renderModal({onClose});
        fireEvent.press(getByText('Start'));
        fireEvent.press(getAllByText('✕')[0]);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onCurrentNodeChange with the first node of the first step on mount', () => {
        const onCurrentNodeChange = jest.fn();
        const steps = [makeStep('Go straight', 'STRAIGHT', 5, [makeNode('start-node')])];
        renderModal({steps, onCurrentNodeChange});
        expect(onCurrentNodeChange).toHaveBeenCalledWith(expect.objectContaining({id: 'start-node'}));
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
        expect(() => renderModal({steps: []})).not.toThrow();
    });

    it('uses "Your location" as origin fallback when origin prop is omitted', () => {
        const {getByText} = render(
            <DirectionsModal origin={undefined} visible={true} steps={defaultSteps} onClose={jest.fn()} />,
        );
        fireEvent.press(getByText('Start'));
        expect(getByText('Your location')).toBeTruthy();
    });

    it('shows floor and building info for a step that has them', () => {
        const steps = [
            makeStep('Take elevator', 'STRAIGHT', 3, [makeNode('n1', '9', 'MB')]),
        ];
        const {getByText, getAllByText} = renderModal({steps});
        fireEvent.press(getByText('Start'));
        expect(getAllByText(/Floor 9/).length).toBeTruthy();
        expect(getAllByText(/MB/).length).toBeTruthy();
    });

    it('does not show distance sub-label when step distance is 0', () => {
        const steps = [makeStep('Arrive', 'DEFAULT', 0, [makeNode('n1')])];
        const {getByText, queryByText} = renderModal({steps});
        fireEvent.press(getByText('Start'));
        expect(queryByText('0.0 m')).toBeNull();
    });

    it('appends an arrival step to the steps list automatically', () => {
        const steps = [makeStep('Walk', 'STRAIGHT', 10, [makeNode('n1')])];
        const {getByText} = renderModal({steps});
        fireEvent.press(getByText('Start'));
        // 1 original + 1 appended = 2 total
        expect(getByText(/Step 1 of 2/)).toBeTruthy();
    });

    it('shows "You have arrived at your destination" as the final appended step', () => {
        const steps = [makeStep('Walk', 'STRAIGHT', 10, [makeNode('n1')])];
        const {getByText} = renderModal({steps});
        fireEvent.press(getByText('Start'));
        fireEvent.press(getByText('Next'));
        expect(getByText('You have arrived at your destination')).toBeTruthy();
    });
});

describe('PanResponder drag handle', () => {
    let capturedGrant: ((e: any, gs: any) => void) | undefined;
    let capturedMove:  ((e: any, gs: any) => void) | undefined;

    beforeEach(() => {
        capturedGrant = undefined;
        capturedMove  = undefined;

        jest.spyOn(require('react-native').PanResponder, 'create')
            .mockImplementation((config: any) => {
                capturedGrant = config.onPanResponderGrant;
                capturedMove  = config.onPanResponderMove;
                return { panHandlers: {} };
            });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('clamps sheet height to MAX_HEIGHT when dragging up beyond limit', () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        act(() => {
            capturedGrant?.({}, { y0: 500, dy: 0 });
        });
        act(() => {
            capturedMove?.({}, { y0: 500, dy: -9999 });
        });

        expect(getByText('End Destination: Room B')).toBeTruthy();
    });

    it('clamps sheet height to MIN_HEIGHT when dragging down beyond limit', () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));

        act(() => {
            capturedGrant?.({}, { y0: 300, dy: 0 });
        });
        act(() => {
            capturedMove?.({}, { y0: 300, dy: 9999 });
        });

        expect(getByText('End Destination: Room B')).toBeTruthy();
    });

    it('sets sheet height correctly for a mid-range drag', () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        act(() => {
            capturedGrant?.({}, { y0: 400, dy: 0 });
        });
        act(() => {
            capturedMove?.({}, { y0: 400, dy: -50 });
        });
        expect(getByText(/Step 1 of/)).toBeTruthy();
    });

    it('does not crash when onPanResponderGrant fires without a prior move', () => {
        renderModal();
        expect(() => {
            act(() => { capturedGrant?.({}, { y0: 200, dy: 0 }); });
        }).not.toThrow();
    });
});

describe('goBack', () => {
    it('does nothing when already on the first step (isFirst guard)', () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));
        fireEvent.press(getByText('Back'));
        expect(getByText(/Step 1 of 4/)).toBeTruthy();
    });

    it('decrements currentIndex by 1 when not on first step', async () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));

        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => expect(getByText(/Step 2 of 4/)).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Back')); });
        await waitFor(() => expect(getByText(/Step 1 of 4/)).toBeTruthy());
    });

    it('shows correct step description after going back', async () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));

        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => expect(getByText('Turn left')).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Back')); });
        await waitFor(() => expect(getByText('Walk straight')).toBeTruthy());
    });

    it('can go back multiple steps correctly', async () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));

        await act(async () => { fireEvent.press(getByText('Next')); });
        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => expect(getByText(/Step 3 of 4/)).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Back')); });
        await waitFor(() => expect(getByText(/Step 2 of 4/)).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Back')); });
        await waitFor(() => expect(getByText(/Step 1 of 4/)).toBeTruthy());
    });

    it('Back button becomes enabled after advancing to step 2', async () => {
        const { getByText } = renderModal();
        fireEvent.press(getByText('Start'));

        await act(async () => { fireEvent.press(getByText('Next')); });
        await waitFor(() => {
            const backBtn = getByText('Back').parent?.parent;
            const isDisabled = backBtn?.props.accessibilityState?.disabled ?? backBtn?.props.disabled;
            expect(isDisabled).toBeFalsy();
        });
    });

    it('calls onCurrentNodeChange with the previous step node when going back', async () => {
        const onCurrentNodeChange = jest.fn();
        const steps = [
            makeStep('Step 1', 'STRAIGHT', 5, [makeNode('node-1')]),
            makeStep('Step 2', 'LEFT',     5, [makeNode('node-2')]),
        ];
        const { getByText } = renderModal({ steps, onCurrentNodeChange });
        fireEvent.press(getByText('Start'));

        await act(async () => { fireEvent.press(getByText('Next')); });

        await waitFor(() => {
            expect(getByText('Step 2')).toBeTruthy();
            expect(onCurrentNodeChange).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'node-2' })
            );
        });

        await act(async () => { fireEvent.press(getByText('Back')); });

        await waitFor(() => {
            expect(onCurrentNodeChange).toHaveBeenLastCalledWith(
                expect.objectContaining({ id: 'node-1' })
            );
        });
    });
});