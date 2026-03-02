import React from 'react';
import {render} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';
import {DirectionsLine} from '../../components/ui/directions-line';

const treeHasStyleValue = (
    node: any,
    key: 'top' | 'bottom',
    value: number,
): boolean => {
    if (!node) return false;
    if (Array.isArray(node)) {
        return node.some((child) => treeHasStyleValue(child, key, value));
    }
    const flattened = StyleSheet.flatten(node.props?.style);
    if (flattened && flattened[key] === value) {
        return true;
    }
    if (!node.children) return false;
    return node.children.some((child: any) => treeHasStyleValue(child, key, value));
};

const mockShapeSource = jest.fn(({children}: any) => <>{children}</>);
const mockLineLayer = jest.fn(({style}: any) => {
    const {View} = require('react-native');
    return <View testID="line-layer" style={style} />;
});
const mockCircleLayer = jest.fn((_props?: any) => null);

//mock MapboxGL but the native map components can't render in tests
jest.mock('@/services/mapbox', () => ({
    MapboxGL: {
        ShapeSource: (props: any) => mockShapeSource(props),
        LineLayer: (props: any) => mockLineLayer(props),
        CircleLayer: (props: any) => mockCircleLayer(props),
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
    beforeEach(() => {
        mockShapeSource.mockClear();
        mockLineLayer.mockClear();
        mockCircleLayer.mockClear();
    });

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

    it('decodes encoded polyline into multiple coordinates', () => {
        render(
            <DirectionsLine
                directions={makeDirections({
                    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                })}
            />,
        );

        expect(mockShapeSource).toHaveBeenCalled();
        const lineShape = mockShapeSource.mock.calls[0][0].shape;
        expect(lineShape.features[0].geometry.coordinates).toHaveLength(3);
    });

    it('applies lineDasharray when provided', () => {
        const {getByTestId} = render(
            <DirectionsLine
                directions={makeDirections()}
                lineDasharray={[2, 1]}
            />,
        );

        const lineLayer = getByTestId('line-layer');
        const flatStyle = Array.isArray(lineLayer.props.style)
            ? Object.assign({}, ...lineLayer.props.style)
            : lineLayer.props.style;
        expect(flatStyle.lineDasharray).toEqual([2, 1]);
    });

    it('does not apply lineDasharray when not provided', () => {
        const {getByTestId} = render(
            <DirectionsLine directions={makeDirections()} />,
        );

        const lineLayer = getByTestId('line-layer');
        const flatStyle = Array.isArray(lineLayer.props.style)
            ? Object.assign({}, ...lineLayer.props.style)
            : lineLayer.props.style;
        expect(flatStyle.lineDasharray).toBeUndefined();
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

    it('positions info card at top when requested', () => {
        const {toJSON} = render(
            <DirectionsLine directions={makeDirections()} infoCardPosition="top" />,
        );
        const tree = toJSON();
        expect(treeHasStyleValue(tree, 'top', 20)).toBe(true);
    });

    it('positions info card at bottom by default', () => {
        const {toJSON} = render(
            <DirectionsLine directions={makeDirections()} />,
        );
        const tree = toJSON();
        expect(treeHasStyleValue(tree, 'bottom', 20)).toBe(true);
    });
});
