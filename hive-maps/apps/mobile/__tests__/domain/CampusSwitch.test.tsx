import { CampusSwitch } from "@/components/campus-switch";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

describe('CampusSwitch', () => {
    it('renders both campuses', () => {
        const onChange = jest.fn();
        const { getByText } = render(<CampusSwitch value="SGW" onChange={onChange} />);
        expect(getByText('SGW')).toBeTruthy();
        expect(getByText('LOYOLA')).toBeTruthy();
    });
    it("SGW tab is selected when value is 'SGW'", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch value="SGW" onChange={onChange} />);
        expect(getByTestId('campus-tab-SGW').props.accessibilityState).toEqual({ selected: true });
        expect(getByTestId('campus-tab-LOY').props.accessibilityState).toEqual({ selected: false });
    });
    it("LOY tab is selected when value is 'LOY'", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch value="LOY" onChange={onChange} />);
        expect(getByTestId('campus-tab-SGW').props.accessibilityState).toEqual({ selected: false });
        expect(getByTestId('campus-tab-LOY').props.accessibilityState).toEqual({ selected: true });
    });
    it("presses LOY tab", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch value="SGW" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-LOY'));
        expect(onChange).toHaveBeenCalledWith('LOY');
    });
    it("presses SGW tab", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch value="LOY" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-SGW'));
        expect(onChange).toHaveBeenCalledWith('SGW');
    });
    it("presses already selected tab (SGW)", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch value="SGW" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-SGW'));
        expect(onChange).toHaveBeenCalledWith('SGW');
    });
    it("presses already selected tab (LOY)", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch value="LOY" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-LOY'));
        expect(onChange).toHaveBeenCalledWith('LOY');
    });
});
