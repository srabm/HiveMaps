/**
 * Unit tests for StepByStepPanel and its sub-components.
 *
 * File location: __tests__/components/ui/step-by-step-panel.test.tsx
 *
 * Stack: Jest + React Native Testing Library (@testing-library/react-native)
 *
 * Run with:
 *   npx jest step-by-step-panel
 *
 * Robolectric note:
 *   These tests are pure JS/React unit tests and run on the JVM (via Jest).
 *   They do NOT require a device or emulator. For Robolectric-style Android
 *   component tests, wrap these in an Android instrumented test runner that
 *   boots a React Native test bundle — the assertions themselves are identical.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StepByStepPanel } from '@/components/ui/step-by-step-panel';
import type { Step } from '@/services/maps/directions-api-adapter';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock MaterialIcons so tests don't need native font assets
jest.mock('@expo/vector-icons/MaterialIcons', () => {
    const { Text } = require('react-native');
    return ({ name, testID }: { name: string; testID?: string }) => (
        <Text testID={testID ?? `icon-${name}`}>{name}</Text>
    );
});

// Use the real buildManeuverKey — mocking it caused unknown-maneuver warnings
// because a stub didn't replicate the "turn" → "turn-right" fallback logic.
jest.mock('@/services/maps/directions-api-adapter', () => {
    const actual = jest.requireActual('@/services/maps/directions-api-adapter');
    return { ...actual };
});

// LayoutAnimation is imported from 'react-native' directly in the component.
// We spread the real RN mock (provided by jest-expo / @testing-library/react-native)
// and override LayoutAnimation so configureNext is a no-op jest.fn() instead of
// undefined (which is what the default RN Jest preset gives it).
jest.mock('react-native', () => {
    const rn = jest.requireActual('react-native');
    rn.LayoutAnimation = {
        configureNext: jest.fn(),
        Presets: { easeInEaseOut: {} },
        Types: {},
        Properties: {},
        create: jest.fn(),
        spring: jest.fn(),
        linear: jest.fn(),
        easeInEaseOut: jest.fn(),
    };
    return rn;
});

// Freeze timers so the 10-second interval doesn't fire during assertions
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const coord = { latitude: 45.0, longitude: -73.0 };

function makeStep(overrides: Partial<Step> = {}): Step {
    return {
        distance: 200,
        duration: 60,
        instruction: 'Head north on Main St',
        maneuver: 'depart',
        startLocation: coord,
        endLocation: { latitude: 45.001, longitude: -73.0 },
        ...overrides,
    };
}

const defaultProps = {
    steps: [
        makeStep(),
        makeStep({ instruction: 'Turn right onto Elm St', maneuver: 'turn', maneuverModifier: 'right' }),
    ],
    currentStep: makeStep(),
    nextStep: makeStep({ instruction: 'Turn right onto Elm St', maneuver: 'turn', maneuverModifier: 'right' }),
    afterNextStep: null,
    currentStepIndex: 0,
    distanceToNextTurn: 150,
    totalDistanceRemaining: 350,
    totalDurationSecondsRemaining: 300,
    arrived: false,
    isRecalculating: false,
    shuttlePhase: null,
    onExit: jest.fn(),
    onArrived: jest.fn(),
};

// ─── Arrived state ────────────────────────────────────────────────────────────

describe('Arrived state', () => {
    it('renders "You have arrived!" message when arrived=true', () => {
        const { getByText } = render(<StepByStepPanel {...defaultProps} arrived />);
        expect(getByText('You have arrived!')).toBeTruthy();
    });

    it('renders "End Navigation" button when arrived=true', () => {
        const { getByText } = render(<StepByStepPanel {...defaultProps} arrived />);
        expect(getByText('End Navigation')).toBeTruthy();
    });

    it('calls onArrived when "End Navigation" is pressed', () => {
        const onArrived = jest.fn();
        const { getByText } = render(<StepByStepPanel {...defaultProps} arrived onArrived={onArrived} />);
        fireEvent.press(getByText('End Navigation'));
        expect(onArrived).toHaveBeenCalledTimes(1);
    });

    it('does not render the instruction panel when arrived', () => {
        const { queryByText } = render(<StepByStepPanel {...defaultProps} arrived />);
        expect(queryByText('Head north on Main St')).toBeNull();
        // Normal "End" button is absent — only "End Navigation" shown
        expect(queryByText('End')).toBeNull();
    });
});

// ─── No currentStep (null guard) ─────────────────────────────────────────────

describe('Null currentStep', () => {
    it('renders nothing when currentStep is null and not arrived', () => {
        const { toJSON } = render(
            <StepByStepPanel {...defaultProps} currentStep={null} arrived={false} />
        );
        expect(toJSON()).toBeNull();
    });
});

// ─── Normal navigation state ──────────────────────────────────────────────────

describe('Normal navigation', () => {
    it('renders the current step instruction', () => {
        const { getByText } = render(<StepByStepPanel {...defaultProps} />);
        expect(getByText('Head north on Main St')).toBeTruthy();
    });

    it('renders the distance to next turn when provided', () => {
        const { getAllByText } = render(
            <StepByStepPanel {...defaultProps} distanceToNextTurn={150} totalDistanceRemaining={350} />
        );
        expect(getAllByText('150 m').length).toBeGreaterThan(0);
    });

    it('renders distance in km when >= 1000 m', () => {
        const { getAllByText } = render(
            <StepByStepPanel {...defaultProps} distanceToNextTurn={1500} totalDistanceRemaining={1500} />
        );
        expect(getAllByText('1.5 km').length).toBeGreaterThan(0);
    });

    it('does not render a distance label when distanceToNextTurn is null', () => {
        // Pass null for both so the bottom bar "remain" stat is also empty
        const { queryByText } = render(
            <StepByStepPanel
                {...defaultProps}
                distanceToNextTurn={null}
                totalDistanceRemaining={null}
            />
        );
        expect(queryByText(/\d+(\.\d+)? km/)).toBeNull();
        expect(queryByText(/^\d+ m$/)).toBeNull();
    });

    it('renders "Then:" next step preview when nextStep is provided', () => {
        const { getByText } = render(<StepByStepPanel {...defaultProps} />);
        expect(getByText('Then: Turn right onto Elm St')).toBeTruthy();
    });

    it('renders "Arriving at destination" when nextStep is null', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} nextStep={null} />
        );
        expect(getByText('Arriving at destination')).toBeTruthy();
    });

    it('falls back to "Continue" when step instruction is empty', () => {
        const { getAllByText } = render(
            <StepByStepPanel
                {...defaultProps}
                currentStep={makeStep({ instruction: '' })}
            />
        );
        expect(getAllByText('Continue').length).toBeGreaterThan(0);
    });

    it('renders the "End" button in normal navigation', () => {
        const { getByText } = render(<StepByStepPanel {...defaultProps} />);
        expect(getByText('End')).toBeTruthy();
    });

    it('calls onExit when "End" is pressed', () => {
        const onExit = jest.fn();
        const { getByText } = render(<StepByStepPanel {...defaultProps} onExit={onExit} />);
        fireEvent.press(getByText('End'));
        expect(onExit).toHaveBeenCalledTimes(1);
    });
});

// ─── Expandable step list ─────────────────────────────────────────────────────

describe('Expandable step list', () => {
    it('does not show all steps by default', () => {
        const { queryByText } = render(<StepByStepPanel {...defaultProps} />);
        // The step row only appears when list is expanded (not in the preview row)
        expect(queryByText(/^Turn right onto Elm St$/)).toBeNull();
    });

    it('shows all steps after pressing the next-step row', () => {
        const { getByText, getAllByText } = render(<StepByStepPanel {...defaultProps} />);
        fireEvent.press(getByText('Then: Turn right onto Elm St'));
        expect(getAllByText('Head north on Main St').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('Turn right onto Elm St').length).toBeGreaterThanOrEqual(1);
    });

    it('hides steps again on second press (toggle)', () => {
        const { getByText, queryByText } = render(<StepByStepPanel {...defaultProps} />);
        fireEvent.press(getByText('Then: Turn right onto Elm St')); // expand
        fireEvent.press(getByText('Then: Turn right onto Elm St')); // collapse
        expect(queryByText(/^Turn right onto Elm St$/)).toBeNull();
    });

    it('highlights the current step row in the expanded list', () => {
        const steps = [
            makeStep({ instruction: 'Step one' }),
            makeStep({ instruction: 'Step two', maneuver: 'turn', maneuverModifier: 'right' }),
        ];
        const { getByText, getAllByText } = render(
            <StepByStepPanel
                {...defaultProps}
                steps={steps}
                currentStep={steps[0]}
                nextStep={steps[1]}
                currentStepIndex={0}
            />
        );
        fireEvent.press(getByText('Then: Step two'));
        expect(getAllByText('Step one').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('Step two').length).toBeGreaterThanOrEqual(1);
    });
});

    it('does not show "Then:" preview when nextStep is null', () => {
        const { queryByText } = render(
            <StepByStepPanel {...defaultProps} nextStep={null} />
        );
        expect(queryByText(/^Then:/)).toBeNull();
    });

    it('marks the current expanded row with "current step"', () => {
        const steps = [
            makeStep({ instruction: 'Step one' }),
            makeStep({ instruction: 'Step two', maneuver: 'turn', maneuverModifier: 'right' }),
        ];
        const { getByText } = render(
            <StepByStepPanel
                {...defaultProps}
                steps={steps}
                currentStep={steps[0]}
                nextStep={steps[1]}
                currentStepIndex={0}
            />
        );
        fireEvent.press(getByText('Then: Step two'));
        expect(getByText('Current Step')).toBeTruthy();
    });




// ─── Recalculating banner ─────────────────────────────────────────────────────

describe('Recalculating banner', () => {
    it('shows "Recalculating route…" when isRecalculating=true', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} isRecalculating />
        );
        expect(getByText('Recalculating route\u2026')).toBeTruthy();
    });

    it('does not show recalculating banner when isRecalculating=false', () => {
        const { queryByText } = render(
            <StepByStepPanel {...defaultProps} isRecalculating={false} />
        );
        expect(queryByText('Recalculating route\u2026')).toBeNull();
    });
});

// ─── Shuttle phase strip ──────────────────────────────────────────────────────

describe('Shuttle phase strip', () => {
    it('shows "Walk to shuttle stop" for walk-to-stop phase', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} shuttlePhase="walk-to-stop" />
        );
        expect(getByText('Walk to shuttle stop')).toBeTruthy();
    });

    it('shows "On shuttle" for shuttle phase', () => {
        const currentStep = makeStep({
            instruction: 'Ride the Concordia Shuttle',
            maneuver: 'depart',
            transitDetails: {
                transitLine: { name: 'Concordia Shuttle', nameShort: 'Shuttle', color: '#e5a712' },
                stopDetails: {
                    departureStop: { name: 'Loyola Stop' },
                    arrivalStop: { name: 'SGW Stop' },
                },
            },
        });
        const { getByText } = render(
            <StepByStepPanel
                {...defaultProps}
                currentStep={currentStep}
                shuttlePhase="shuttle"
            />
        );
        expect(getByText('On shuttle')).toBeTruthy();
    });

    it('shows "Walk to destination" for walk-from-stop phase', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} shuttlePhase="walk-from-stop" />
        );
        expect(getByText('Walk to destination')).toBeTruthy();
    });

    it('does not show phase strip when shuttlePhase is null', () => {
        const { queryByText } = render(
            <StepByStepPanel {...defaultProps} shuttlePhase={null} />
        );
        expect(queryByText('Walk to shuttle stop')).toBeNull();
        expect(queryByText('On shuttle')).toBeNull();
        expect(queryByText('Walk to destination')).toBeNull();
    });

    it('hides the maneuver icon row and shows shuttle label when shuttlePhase is "shuttle"', () => {
        const currentStep = makeStep({
            instruction: 'Ride the Concordia Shuttle',
            maneuver: 'depart',
            transitDetails: {
                transitLine: { name: 'Shuttle', nameShort: 'Shuttle', color: '#e5a712' },
                stopDetails: {
                    departureStop: { name: 'A' },
                    arrivalStop: { name: 'B' },
                },
            },
        });
        const { getByText, queryByText } = render(
            <StepByStepPanel
                {...defaultProps}
                currentStep={currentStep}
                shuttlePhase="shuttle"
            />
        );
        expect(getByText('Ride the Concordia Shuttle')).toBeTruthy();
        expect(queryByText('Head north on Main St')).toBeNull();
    });
});

// ─── TransitCard ─────────────────────────────────────────────────────────────

describe('TransitCard', () => {
    const transitStep = makeStep({
        transitDetails: {
            transitLine: {
                name: 'Green Line',
                nameShort: '24',
                color: '#16a34a',
                headsign: 'North',
                vehicle: { type: 'BUS' },
            },
            stopDetails: {
                departureStop: { name: 'Berri-UQAM' },
                arrivalStop: { name: 'McGill' },
                departureTime: { time: '2025-06-01T09:00:00-04:00' },
                arrivalTime: { time: '2025-06-01T09:05:00-04:00' },
            },
        },
    });

    it('renders the transit line short name badge', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={transitStep} />
        );
        expect(getByText('24')).toBeTruthy();
    });

    it('renders the full transit line name alongside the route identifier when both are present', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={transitStep} />
        );
        expect(getByText('Green Line')).toBeTruthy();
    });

    it('renders the transit headsign direction when available', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={transitStep} />
        );
        expect(getByText('Towards North')).toBeTruthy();
    });

    it('renders departure stop "Board at" label and stop name', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={transitStep} />
        );
        expect(getByText('Board at')).toBeTruthy();
        expect(getByText('Berri-UQAM')).toBeTruthy();
    });

    it('renders arrival stop "Exit at" label and stop name', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={transitStep} />
        );
        expect(getByText('Exit at')).toBeTruthy();
        expect(getByText('McGill')).toBeTruthy();
    });

    it('falls back to full line name when nameShort is absent', () => {
        const step = makeStep({
            transitDetails: {
                transitLine: { name: 'Orange Line', color: '#ea580c' },
                stopDetails: {
                    departureStop: { name: 'Snowdon' },
                    arrivalStop: { name: 'Cote-Vertu' },
                },
            },
        });
        const { getAllByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getAllByText('Orange Line').length).toBeGreaterThan(0);
    });

    it('renders the subway icon for metro steps', () => {
        const step = makeStep({
            transitDetails: {
                transitLine: {
                    name: 'Green Line',
                    nameShort: '1',
                    color: '#00853F',
                    vehicle: { type: 'SUBWAY' },
                },
                stopDetails: {
                    departureStop: { name: 'Atwater' },
                    arrivalStop: { name: 'Guy-Concordia' },
                },
            },
        });
        const { getAllByTestId } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getAllByTestId('icon-subway').length).toBeGreaterThan(0);
    });

    it('uses station-level wording for metro current-step instructions', () => {
        const step = makeStep({
            instruction: 'Take the subway towards Angrignon',
            transitDetails: {
                transitLine: {
                    name: 'Green Line',
                    nameShort: '1',
                    color: '#00853F',
                    headsign: 'Angrignon',
                    vehicle: { type: 'SUBWAY' },
                },
                stopDetails: {
                    departureStop: { name: 'Atwater' },
                    arrivalStop: { name: 'Guy-Concordia' },
                },
            },
        });
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getByText('Enter station Atwater towards Angrignon')).toBeTruthy();
    });

    it('uses station-level wording for metro next-step previews', () => {
        const nextMetroStep = makeStep({
            instruction: 'Take the subway towards Angrignon',
            transitDetails: {
                transitLine: {
                    name: 'Green Line',
                    nameShort: '1',
                    color: '#00853F',
                    headsign: 'Angrignon',
                    vehicle: { type: 'SUBWAY' },
                },
                stopDetails: {
                    departureStop: { name: 'Atwater' },
                    arrivalStop: { name: 'Guy-Concordia' },
                },
            },
        });
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} nextStep={nextMetroStep} />
        );
        expect(getByText('Then: Enter station Atwater towards Angrignon')).toBeTruthy();
    });

    it('uses headsign-only wording for metro steps when no departure stop is available', () => {
        const step = makeStep({
            instruction: 'Take the metro towards Angrignon',
            transitDetails: {
                transitLine: {
                    name: 'Green Line',
                    color: '#00853F',
                    headsign: 'Angrignon',
                    vehicle: { type: 'METRO' },
                },
                stopDetails: {
                    arrivalStop: { name: 'Guy-Concordia' },
                },
            },
        });
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getByText('Take metro towards Angrignon')).toBeTruthy();
    });

    it('falls back to generic station wording for metro steps without stop or headsign', () => {
        const step = makeStep({
            instruction: 'Take the metro',
            transitDetails: {
                transitLine: {
                    name: 'Green Line',
                    color: '#00853F',
                    vehicle: { type: 'RAIL' },
                },
                stopDetails: {},
            },
        });
        const { getByText, getAllByTestId } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getByText('Enter station')).toBeTruthy();
        expect(getAllByTestId('icon-train').length).toBeGreaterThan(0);
    });

    it('uses route number and headsign for bus current-step instructions', () => {
        const step = makeStep({
            instruction: 'Take the bus towards Nord',
            transitDetails: {
                transitLine: {
                    name: 'Sherbrooke',
                    nameShort: '24',
                    color: '#16a34a',
                    headsign: 'Nord',
                    vehicle: { type: 'BUS' },
                },
                stopDetails: {
                    departureStop: { name: 'Berri-UQAM' },
                    arrivalStop: { name: 'McGill' },
                },
            },
        });
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getByText('Take bus 24 towards Nord')).toBeTruthy();
    });

    it('uses route-only wording when only a tram route number is available', () => {
        const step = makeStep({
            instruction: 'Board tram 55',
            transitDetails: {
                transitLine: {
                    nameShort: '55',
                    color: '#0f766e',
                    vehicle: { type: 'TRAM' },
                },
                stopDetails: {},
            },
        });
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getByText('Take tram 55')).toBeTruthy();
    });

    it('uses line-name wording when no route id is available but headsign exists', () => {
        const step = makeStep({
            instruction: 'Board shuttle',
            transitDetails: {
                transitLine: {
                    name: 'Concordia Shuttle',
                    color: '#9d1e30',
                    headsign: 'Loyola',
                    vehicle: { type: 'BUS' },
                },
                stopDetails: {},
            },
        });
        const { getAllByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getAllByText('Towards Loyola').length).toBeGreaterThan(0);
        expect(getAllByText('Take Concordia Shuttle towards Loyola').length).toBeGreaterThan(0);
    });

    it('falls back to the raw instruction when transit metadata cannot build a label', () => {
        const step = makeStep({
            instruction: 'Use the special shuttle service',
            transitDetails: {
                transitLine: {
                    color: '#374151',
                    vehicle: { type: 'BUS' },
                },
                stopDetails: {},
            },
        });
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getByText('Use the special shuttle service')).toBeTruthy();
    });

    it('uses a bus icon for bus steps', () => {
        const step = makeStep({
            instruction: 'Take the bus towards Nord',
            transitDetails: {
                transitLine: {
                    name: 'Sherbrooke',
                    nameShort: '24',
                    color: '#16a34a',
                    headsign: 'Nord',
                    vehicle: { type: 'BUS' },
                },
                stopDetails: {
                    departureStop: { name: 'Berri-UQAM' },
                    arrivalStop: { name: 'McGill' },
                },
            },
        });
        const { getAllByTestId } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} nextStep={step} />
        );
        expect(getAllByTestId('icon-directions-bus').length).toBeGreaterThan(0);
    });

    it('shows the inline headsign text when route id and line name are the same', () => {
        const step = makeStep({
            transitDetails: {
                transitLine: {
                    name: '24',
                    nameShort: '24',
                    color: '#16a34a',
                    headsign: 'Nord',
                    vehicle: { type: 'BUS' },
                },
                stopDetails: {
                    departureStop: { name: 'Berri-UQAM' },
                    arrivalStop: { name: 'McGill' },
                },
            },
        });
        const { getByText, queryByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={step} />
        );
        expect(getByText('Towards Nord')).toBeTruthy();
        expect(queryByText(/^24$/)).toBeTruthy();
    });

    it('shows a transit stop summary in the current-step panel', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} currentStep={transitStep} />
        );
        expect(getByText('Board at Berri-UQAM')).toBeTruthy();
        expect(getByText('Exit at McGill')).toBeTruthy();
    });

    it('shows a transit stop summary in the expanded directions list', () => {
        const { getByText, getAllByText } = render(
            <StepByStepPanel
                {...defaultProps}
                steps={[transitStep]}
                currentStep={transitStep}
                nextStep={null}
                currentStepIndex={0}
            />
        );

        fireEvent.press(getByText('Arriving at destination'));
        expect(getAllByText('Board at Berri-UQAM').length).toBeGreaterThan(0);
        expect(getAllByText('Exit at McGill').length).toBeGreaterThan(0);
    });

    it('renders no TransitCard when step has no transitDetails', () => {
        const { queryByText } = render(<StepByStepPanel {...defaultProps} />);
        expect(queryByText('Board at')).toBeNull();
        expect(queryByText('Exit at')).toBeNull();
    });
});

// ─── Bottom stats bar ─────────────────────────────────────────────────────────

describe('Bottom stats bar', () => {
    it('renders the "remain" distance label', () => {
        // Use distinct values so distanceToNextTurn and totalDistanceRemaining
        // don't produce the same text node
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} distanceToNextTurn={100} totalDistanceRemaining={500} />
        );
        expect(getByText('500 m')).toBeTruthy();
        expect(getByText('remain')).toBeTruthy();
    });

    it('renders "arrival" label in bottom bar', () => {
        const { getByText } = render(<StepByStepPanel {...defaultProps} />);
        expect(getByText('arrival')).toBeTruthy();
    });

    it('renders duration in minutes when < 60 min', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} totalDurationSecondsRemaining={300} />
        );
        expect(getByText('5')).toBeTruthy();
        expect(getByText('min')).toBeTruthy();
    });

    it('renders duration in hours when >= 60 min', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} totalDurationSecondsRemaining={5400} />
        );
        expect(getByText('1h 30')).toBeTruthy();
    });

    it('uses 0 seconds as fallback when totalDurationSecondsRemaining is null', () => {
        const { getByText } = render(
            <StepByStepPanel {...defaultProps} totalDurationSecondsRemaining={null} />
        );
        expect(getByText('0')).toBeTruthy();
    });

    it('does not crash after 10-second interval tick', () => {
        const { getByText } = render(<StepByStepPanel {...defaultProps} />);
        act(() => { jest.advanceTimersByTime(10_000); });
        expect(getByText('arrival')).toBeTruthy();
    });
});

// ─── formatDist helper (via rendered output) ──────────────────────────────────

describe('formatDist display values', () => {
    // Both props set to the same value so the same text appears in both the
    // distance label and the bottom "remain" stat — use getAllByText.
    const cases: [number, string][] = [
        [0,     '0 m'],
        [50,    '50 m'],
        [99,    '99 m'],
        [100,   '100 m'],
        [155,   '160 m'],   // Math.round(155/10)*10 = 160
        [1000,  '1.0 km'],
        [1500,  '1.5 km'],
        [12345, '12.3 km'],
    ];

    test.each(cases)('%i m renders as "%s"', (metres, expected) => {
        const { getAllByText } = render(
            <StepByStepPanel
                {...defaultProps}
                distanceToNextTurn={metres}
                totalDistanceRemaining={metres}
            />
        );
        expect(getAllByText(expected).length).toBeGreaterThan(0);
    });
});

// ─── Interval cleanup ─────────────────────────────────────────────────────────

describe('Interval cleanup', () => {
    it('clears the 10-second interval on unmount', () => {
        const clearSpy = jest.spyOn(global, 'clearInterval');
        const { unmount } = render(<StepByStepPanel {...defaultProps} />);
        unmount();
        expect(clearSpy).toHaveBeenCalled();
    });
});
