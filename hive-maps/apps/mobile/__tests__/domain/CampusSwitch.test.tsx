import { CampusSwitch } from "@/components/campus-switch";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const campusOptions = [
    { id: 'SGW', label: 'SGW', name: 'Sir George Williams', center: [-73.5788, 45.4972] as [number, number], zoom: 16.2 },
    { id: 'LOY', label: 'Loyola', name: 'Loyola', center: [-73.6406, 45.4583] as [number, number], zoom: 16.0 },
];

describe('CampusSwitch', () => {
    it('renders both campuses', () => {
        const onChange = jest.fn();
        const { getByText } = render(<CampusSwitch options={campusOptions} value="SGW" onChange={onChange} />);
        expect(getByText('SGW')).toBeTruthy();
        expect(getByText('Loyola')).toBeTruthy();
    });
    it("SGW tab is selected when value is 'SGW'", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch options={campusOptions} value="SGW" onChange={onChange} />);
        expect(getByTestId('campus-tab-SGW').props.accessibilityState).toEqual({ selected: true });
        expect(getByTestId('campus-tab-LOY').props.accessibilityState).toEqual({ selected: false });
    });
    it("LOY tab is selected when value is 'LOY'", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch options={campusOptions} value="LOY" onChange={onChange} />);
        expect(getByTestId('campus-tab-SGW').props.accessibilityState).toEqual({ selected: false });
        expect(getByTestId('campus-tab-LOY').props.accessibilityState).toEqual({ selected: true });
    });
    it("presses LOY tab", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch options={campusOptions} value="SGW" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-LOY'));
        expect(onChange).toHaveBeenCalledWith('LOY');
    });
    it("presses SGW tab", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch options={campusOptions} value="LOY" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-SGW'));
        expect(onChange).toHaveBeenCalledWith('SGW');
    });
    it("presses already selected tab (SGW)", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch options={campusOptions} value="SGW" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-SGW'));
        expect(onChange).toHaveBeenCalledWith('SGW');
    });
    it("presses already selected tab (LOY)", () => {
        const onChange = jest.fn();
        const { getByTestId } = render(<CampusSwitch options={campusOptions} value="LOY" onChange={onChange} />);
        fireEvent.press(getByTestId('campus-tab-LOY'));
        expect(onChange).toHaveBeenCalledWith('LOY');
    });
});
