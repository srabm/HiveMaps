import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {NextClassPrompt} from '@/components/next-class-prompt';

describe('NextClassPrompt', () => {
    it('renders the supplied copy', () => {
        const {getByText} = render(
            <NextClassPrompt
                body='Navigate to SOEN 341 Tutorial. Your next class is in Room H-920, Hall Building'
                onDismiss={jest.fn()}
                onStartDirections={jest.fn()}
            />
        );

        expect(getByText('Your next class is coming up!')).toBeTruthy();
        expect(getByText('Navigate to SOEN 341 Tutorial. Your next class is in Room H-920, Hall Building')).toBeTruthy();
        
    });
    it('calls the provided actions', () => {
        const onDismiss = jest.fn();
        const onStartDirections = jest.fn();
        const {getByTestId} = render(
            <NextClassPrompt
                body='Navigate to class.'
                onDismiss={onDismiss}
                onStartDirections={onStartDirections}
            />
        );

        fireEvent.press(getByTestId('next-class-start-directions'));
        fireEvent.press(getByTestId('next-class-dismiss'));

        expect(onStartDirections).toHaveBeenCalledTimes(1);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});