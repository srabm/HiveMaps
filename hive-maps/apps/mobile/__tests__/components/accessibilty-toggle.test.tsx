import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccessibilityToggle from '@/components/indoor/accessibility-toggle';

jest.mock('@expo/vector-icons', () => ({
    MaterialCommunityIcons: () => null,
}));

describe('AccessibilityToggle', () => {
    it('renders correctly', () => {
        const { getByTestId } = render(<AccessibilityToggle />);
        expect(getByTestId('accessibility-toggle')).toBeTruthy();
    });

    it('defaults to disabled state when no props provided', () => {
        const { getByTestId } = render(<AccessibilityToggle />);
        const toggle = getByTestId('accessibility-toggle');
        expect(toggle.props.accessibilityState.checked).toBe(false);
    });

    it('reflects enabled=true correctly', () => {
        const { getByTestId } = render(<AccessibilityToggle enabled={true} />);
        const toggle = getByTestId('accessibility-toggle');
        expect(toggle.props.accessibilityState.checked).toBe(true);
    });

    it('reflects enabled=false correctly', () => {
        const { getByTestId } = render(<AccessibilityToggle enabled={false} />);
        const toggle = getByTestId('accessibility-toggle');
        expect(toggle.props.accessibilityState.checked).toBe(false);
    });

    it('calls onToggle with true when pressed while disabled', () => {
        const onToggle = jest.fn();
        const { getByTestId } = render(
            <AccessibilityToggle enabled={false} onToggle={onToggle} />
        );
        fireEvent.press(getByTestId('accessibility-toggle'));
        expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onToggle with false when pressed while enabled', () => {
        const onToggle = jest.fn();
        const { getByTestId } = render(
            <AccessibilityToggle enabled={true} onToggle={onToggle} />
        );
        fireEvent.press(getByTestId('accessibility-toggle'));
        expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('calls onToggle exactly once per press', () => {
        const onToggle = jest.fn();
        const { getByTestId } = render(
            <AccessibilityToggle enabled={false} onToggle={onToggle} />
        );
        fireEvent.press(getByTestId('accessibility-toggle'));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});
