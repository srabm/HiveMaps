import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import { ShuttleScheduleModal } from '@/components/ui/shuttle-schedule-modal';

const baseShuttleScheduleModalProps = {
    visible: true,
    tabs: [
        {
            key: 'to-loyola',
            label: 'To Loyola',
            items: [
                { key: 'loyola-930', timeLabel: '9:30 AM', isPast: true, isNext: false },
                { key: 'loyola-945', timeLabel: '9:45 AM', isPast: false, isNext: true },
                { key: 'loyola-1000', timeLabel: '10:00 AM', isPast: false, isNext: false },
            ],
        },
        {
            key: 'to-sgw',
            label: 'To SGW',
            items: [
                { key: 'sgw-1015', timeLabel: '10:15 AM', isPast: false, isNext: true },
                { key: 'sgw-1030', timeLabel: '10:30 AM', isPast: false, isNext: false },
            ],
        },
    ],
    initialTabKey: 'to-loyola',
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
            expect(getByText('To Loyola')).toBeTruthy();
            expect(getByText('To SGW')).toBeTruthy();
        });

        it('renders all times', () => {
            const { getByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps}/>);
            expect(getByText('9:30 AM')).toBeTruthy();
            expect(getByText('9:45 AM')).toBeTruthy();
            expect(getByText('10:00 AM')).toBeTruthy();
            expect(getByText('Next')).toBeTruthy();
        });

        it('switches between direction tabs', () => {
            const { getByText, queryByText } = render(<ShuttleScheduleModal {...baseShuttleScheduleModalProps}/>);
            expect(getByText('9:45 AM')).toBeTruthy();
            expect(queryByText('10:15 AM')).toBeNull();

            fireEvent.press(getByText('To SGW'));

            expect(getByText('10:15 AM')).toBeTruthy();
            expect(queryByText('9:45 AM')).toBeNull();
            expect(getByText('Next')).toBeTruthy();
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
                <ShuttleScheduleModal
                    {...baseShuttleScheduleModalProps}
                    tabs={[{key: 'to-loyola', label: 'To Loyola', items: []}]}
                    initialTabKey='to-loyola'
                />
            );
            expect(queryByText('8:00 AM')).toBeNull();
            expect(queryByText('No departures available.')).toBeTruthy();
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
