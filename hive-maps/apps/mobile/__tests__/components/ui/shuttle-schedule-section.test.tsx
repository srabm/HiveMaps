import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {ShuttleScheduleSection} from '@/components/ui/shuttle-schedule-section';

const baseDepartures = [
    {timeLabel: '9:30 AM', etaLabel: 'in 5 min', key: 'dep-1'},
    {timeLabel: '9:45 AM', etaLabel: 'in 20 min', key: 'dep-2'},
    {timeLabel: '10:00 AM', etaLabel: 'in 35 min', key: 'dep-3'},
];

const baseProps = {
    directionLabel: 'SGW → Loyola',
    hasSchedule: true,
    showNextServiceLabel: false,
    departures: baseDepartures,
    showSeeMoreButton: false,
    onOpenModal: jest.fn(),
};

afterEach(() => {
    jest.clearAllMocks();
});

describe('ShuttleScheduleSection — rendering', () => {
    it('renders the "Shuttle Schedule" title', () => {
        const {getByText} = render(<ShuttleScheduleSection {...baseProps} />);
        expect(getByText('Shuttle Schedule')).toBeTruthy();
    });

    it('renders the direction label', () => {
        const {getByText} = render(<ShuttleScheduleSection {...baseProps} />);
        expect(getByText('SGW → Loyola')).toBeTruthy();
    });

    it('renders all departure time labels', () => {
        const {getByText} = render(<ShuttleScheduleSection {...baseProps} />);
        expect(getByText('9:30 AM')).toBeTruthy();
        expect(getByText('9:45 AM')).toBeTruthy();
        expect(getByText('10:00 AM')).toBeTruthy();
    });

    it('renders all ETA labels', () => {
        const {getByText} = render(<ShuttleScheduleSection {...baseProps} />);
        expect(getByText('in 5 min')).toBeTruthy();
        expect(getByText('in 20 min')).toBeTruthy();
        expect(getByText('in 35 min')).toBeTruthy();
    });

    it('renders validPeriod when provided', () => {
        const {getByText} = render(
            <ShuttleScheduleSection {...baseProps} validPeriod="January 12 - April 15, 2026" />
        );
        expect(getByText('Valid January 12 - April 15, 2026')).toBeTruthy();
    });

    it('does not render validPeriod when omitted', () => {
        const {queryByText} = render(<ShuttleScheduleSection {...baseProps} />);
        expect(queryByText(/Valid/)).toBeNull();
    });

    it('renders "See full schedule" button when showSeeMoreButton=true', () => {
        const {getByText} = render(
            <ShuttleScheduleSection {...baseProps} showSeeMoreButton={true} />
        );
        expect(getByText('See full schedule')).toBeTruthy();
    });

    it('does not render "See full schedule" button when showSeeMoreButton=false', () => {
        const {queryByText} = render(<ShuttleScheduleSection {...baseProps} />);
        expect(queryByText('See full schedule')).toBeNull();
    });

});

describe('ShuttleScheduleSection — no schedule / fallback', () => {
    it('does not render departure rows when hasSchedule=false', () => {
        const {queryByText} = render(
            <ShuttleScheduleSection {...baseProps} hasSchedule={false} />
        );
        expect(queryByText('9:30 AM')).toBeNull();
    });

    it('shows transit suggestion when hasSchedule=false and onFallbackPress is provided', () => {
        const {getByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                hasSchedule={false}
                onFallbackPress={jest.fn()}
            />
        );
        expect(getByText('Service currently unavailable.')).toBeTruthy();
        expect(getByText('Check Transit')).toBeTruthy();
    });

    it('shows "Not running today" message when showNextServiceLabel=true and onFallbackPress provided', () => {
        const {getByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                showNextServiceLabel={true}
                nextServiceLabel="Monday"
                onFallbackPress={jest.fn()}
            />
        );
        expect(getByText('Not running today — need a ride now?')).toBeTruthy();
    });

    it('does not show transit suggestion when onFallbackPress is not provided', () => {
        const {queryByText} = render(
            <ShuttleScheduleSection {...baseProps} hasSchedule={false} />
        );
        expect(queryByText('Check Transit')).toBeNull();
    });

    it('shows "No more departures today." when departures is empty and showNextServiceLabel=false', () => {
        const {getByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                departures={[]}
                showNextServiceLabel={false}
                onFallbackPress={jest.fn()}
            />
        );
        expect(getByText('No more departures today — need a ride now?')).toBeTruthy();
        expect(getByText('No more departures today.')).toBeTruthy();
    });
});

describe('ShuttleScheduleSection — next service day label', () => {
    it('shows nextServiceLabel inline when showNextServiceLabel=true and nextServiceLabel provided', () => {
        const {getByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                showNextServiceLabel={true}
                nextServiceLabel="Monday"
            />
        );
        expect(getByText(/Next: Monday/)).toBeTruthy();
    });

    it('does not show inline next service text when showNextServiceLabel=false', () => {
        const {queryByText} = render(<ShuttleScheduleSection {...baseProps} />);
        expect(queryByText(/Next:/)).toBeNull();
    });
});

describe('ShuttleScheduleSection — inline metrics', () => {
    const inlineMetrics = {
        durationText: '45 min',
        distanceText: '12 km',
        arrivalLabel: 'Arrive by 10:30 AM',
    };

    it('renders inline metrics when provided and showNextServiceLabel=false', () => {
        const {getByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                inlineMetrics={inlineMetrics}
                showNextServiceLabel={false}
            />
        );
        expect(getByText('45')).toBeTruthy();
        expect(getByText('min')).toBeTruthy();
        expect(getByText('Arrive by 10:30 AM')).toBeTruthy();
        expect(getByText('12 km')).toBeTruthy();
    });

    it('does not render inline metrics when showNextServiceLabel=true', () => {
        const {queryByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                inlineMetrics={inlineMetrics}
                showNextServiceLabel={true}
                nextServiceLabel="Monday"
            />
        );
        expect(queryByText('Arrive by 10:30 AM')).toBeNull();
    });

    it('does not render inline metrics when inlineMetrics is null', () => {
        const {queryByText} = render(
            <ShuttleScheduleSection {...baseProps} inlineMetrics={null} />
        );
        expect(queryByText('Arrive by 10:30 AM')).toBeNull();
    });
});

describe('ShuttleScheduleSection — interactions', () => {
    it('calls onOpenModal when "See full schedule" is pressed', () => {
        const onOpenModal = jest.fn();
        const {getByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                showSeeMoreButton={true}
                onOpenModal={onOpenModal}
            />
        );
        fireEvent.press(getByText('See full schedule'));
        expect(onOpenModal).toHaveBeenCalledTimes(1);
    });

    it('calls onFallbackPress when "Check Transit" is pressed', () => {
        const onFallbackPress = jest.fn();
        const {getByText} = render(
            <ShuttleScheduleSection
                {...baseProps}
                hasSchedule={false}
                onFallbackPress={onFallbackPress}
            />
        );
        fireEvent.press(getByText('Check Transit'));
        expect(onFallbackPress).toHaveBeenCalledTimes(1);
    });
});
