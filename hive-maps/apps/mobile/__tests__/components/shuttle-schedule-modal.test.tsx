import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import { ShuttleScheduleModal } from '@/components/ui/shuttle-schedule-modal';

const baseShuttleScheduleModalProps = {
    visible: true,
    directionLabel: 'North',
    times: ['9:30 AM', '9:45 AM', '10:00 AM'],
    onClose: jest.fn(),
};

describe('ShuttleScheduleModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders the title and direction label', () => {
            const { getByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps}/>);
            expect(getByText('Shuttle Schedule')).toBeTruthy();
            expect(getByText('North')).toBeTruthy();

        });

        it('renders all times', () => {
            const { getByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps}/>);
            expect(getByText('9:30 AM')).toBeTruthy();
            expect(getByText('9:45 AM')).toBeTruthy();
            expect(getByText('10:00 AM')).toBeTruthy();
        });

        it('rebders serviceDateLabel when provided', () => {
            const { getByText } = render(
                <ShuttleScheduleModal {...baseShuttleScheduleModalProps} serviceDateLabel='Mon, Feb 22' />
            );
            expect(getByText('Mon, Feb 22')).toBeTruthy();
        });

        it('does not render serviceDateLabel when omitted', () => {
            const { queryByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps} />);
            expect(queryByText('Mon, Feb 22')).toBeNull();
        });

        it('renders empty list when times is empty', () => {
            const { queryByText } = render(
                <ShuttleScheduleModal {...baseShuttleScheduleModalProps} times={[]} />
            );
            expect(queryByText('8:00 AM')).toBeNull();
        });

        it('renders the Close Button', () => {
            const { getByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps} />);
            expect(getByText('Close')).toBeTruthy();
        });
    });

    describe('visibility', () => {
        it('is visible when visible=true', () => {
            const { getByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps} visible={true} />);
            expect(getByText('Shuttle Schedule')).toBeTruthy();
        });

        it('is not visible when visible=false', () => {
            const { queryByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps} visible={false} />);
            expect(queryByText('Shuttle Schedule')).toBeNull();
        });
    });

    describe('interactions', () => {
        it('calls onClose when the Close button is pressed', () => {
            const onClose = jest.fn();
            const { getByText } = render(
                <ShuttleScheduleModal {...baseShuttleScheduleModalProps} onClose={onClose}/>
            );
            fireEvent.press(getByText('Close'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});