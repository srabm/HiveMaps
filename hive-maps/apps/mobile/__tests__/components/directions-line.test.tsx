import React from 'react';
import {render} from '@testing-library/react-native';
import {DirectionsLine} from '../../components/ui/directions-line';

//mock MapboxGL but the native map components can't render in tests
jest.mock('@/services/mapbox', () => ({
    MapboxGL: {
        ShapeSource: ({children}: any) => <> {children}</>,
        LineLayer: () => null,
        CircleLayer: () => null
    },
}));

const makeDirections = (overrides = {}) => ({
    distanceMeters: 2500,
    durationSeconds: 1800,
    polyline: 'mockPolyline',
    steps: [],
    ...overrides
});

//task 2.3.3 polyline rendering
describe('DirectionsLine rendering', () => {
    it('renders without crashing for valid polyline', () => {
        const {toJSON} = render(
            <DirectionsLine directions = {makeDirections()}/>
        );
        expect(toJSON()).not.toBeNull();
    });

    it('returns null for an empty polyline', () => {
        const {toJSON} = render(
            <DirectionsLine directions = {makeDirections({polyline: ''})}/>
        );
        expect(toJSON()).toBeNull();
    });
});

//task 2.3.4 display distance and estimated travel time
describe('DirectionsLine display information', () => {
    it('displays distance in km', () => {
        const {getByText} = render(
            <DirectionsLine directions = {makeDirections({distanceMeters: 2500})}/>
        );
        expect(getByText('2.5 km')).toBeTruthy();
    });

    it('displays distance in meters when under 1 km', () => {
        const {getByText} = render(
            <DirectionsLine directions = {makeDirections({distanceMeters: 450})}/>
        );
        expect(getByText('450 m')).toBeTruthy();
    });

    it('displays duration in minutes', () => {
        const {getByText} = render(
            <DirectionsLine directions = {makeDirections({durationSeconds: 600})}/>
        );
        expect(getByText('10 min')).toBeTruthy();
    });

    it('displays duration with hours when over 1hr', () => {
        const{getByText} = render(
            <DirectionsLine directions = {makeDirections({durationSeconds: 5400})}/>
        );
        expect(getByText('1 hr 30 min')).toBeTruthy();
    });

    it('displays distance and duration labels', () => {
        const {getByText} = render(
            <DirectionsLine directions = {makeDirections()}/>
        );
        expect(getByText('Distance')).toBeTruthy();
        expect(getByText('Duration')).toBeTruthy();
    });
});