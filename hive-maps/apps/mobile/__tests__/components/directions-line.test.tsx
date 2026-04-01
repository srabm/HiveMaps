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

    it('includes the start endpoint when showStartEndpoint is true', () => {
        render(
            <DirectionsLine
                directions={makeDirections({
                    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                })}
                showStartEndpoint={true}
                showEndEndpoint={false}
            />,
        );

        const endpointsShape = mockShapeSource.mock.calls[1][0].shape;
        expect(endpointsShape.features).toEqual([
            expect.objectContaining({
                id: 'start-point',
                properties: {type: 'start'},
                geometry: expect.objectContaining({
                    type: 'Point',
                    coordinates: [-120.2, 38.5],
                }),
            }),
        ]);
    });

    it('includes the end endpoint when showEndEndpoint is true', () => {
        render(
            <DirectionsLine
                directions={makeDirections({
                    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                })}
                showStartEndpoint={false}
                showEndEndpoint={true}
            />,
        );

        const endpointsShape = mockShapeSource.mock.calls[1][0].shape;
        expect(endpointsShape.features).toEqual([
            expect.objectContaining({
                id: 'end-point',
                properties: {type: 'end'},
                geometry: expect.objectContaining({
                    type: 'Point',
                    coordinates: [-126.453, 43.252],
                }),
            }),
        ]);
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
})


const makeNode = (id: string, lng: number, lat: number) => ({
    id,
    label: 'Junction',
    wheelchairAccessible: true,
    floor: '2',
    building: 'LB',
    longitude: lng,
    latitude: lat,
});

const mockIndoorSteps = [
    {
        direction: 'STRAIGHT',
        distance: 57,
        description: 'Go straight 57m',
        nodes: [makeNode('N1', -73.001, 45.001), makeNode('N2', -73.002, 45.002)],
    },
    {
        direction: 'LEFT',
        distance: 0,
        description: 'Turn left',
        nodes: [makeNode('N2', -73.002, 45.002)],
    },
    {
        direction: 'STRAIGHT',
        distance: 41,
        description: 'Go straight 41m',
        nodes: [makeNode('N2', -73.002, 45.002), makeNode('N3', -73.003, 45.003)],
    },
];

const indoorProps = (steps: typeof mockIndoorSteps) =>
    ({
        useIndoorData: true,
        IndoorDirections: steps,
        directions: makeDirections(), // dummy directions
    } as any);


describe('DirectionsLine – indoor map', () => {
    beforeEach(() => {
        mockShapeSource.mockClear();
        mockLineLayer.mockClear();
        mockCircleLayer.mockClear();
    });

    it('renders without crashing for valid indoor steps', () => {
        const { toJSON } = render(
            <DirectionsLine {...indoorProps(mockIndoorSteps)} />,
        );
        expect(toJSON()).not.toBeNull();
    });

    it('returns null when IndoorDirections is empty', () => {
        const { toJSON } = render(
            <DirectionsLine {...indoorProps([])} />,
        );
        expect(toJSON()).toBeNull();
    });

    it('passes a valid GeoJSON FeatureCollection to ShapeSource', () => {
        render(<DirectionsLine {...indoorProps(mockIndoorSteps)} />);
        const shape = mockShapeSource.mock.calls[0][0].shape;
        expect(shape.type).toBe('FeatureCollection');
        expect(shape.features[0].geometry.type).toBe('LineString');
    });

    it('maps each node to [lng, lat]', () => {
        render(<DirectionsLine {...indoorProps(mockIndoorSteps)} />);
        const coords = mockShapeSource.mock.calls[0][0].shape.features[0].geometry.coordinates;
        expect(coords[0]).toEqual([-73.001, 45.001]);
    });

    it('flattens nodes across all steps', () => {
        render(<DirectionsLine {...indoorProps(mockIndoorSteps)} />);
        const coords = mockShapeSource.mock.calls[0][0].shape.features[0].geometry.coordinates;
        expect(coords).toHaveLength(5);
    });

    it('includes coordinates from every step', () => {
        render(<DirectionsLine {...indoorProps(mockIndoorSteps)} />);
        const coords = mockShapeSource.mock.calls[0][0].shape.features[0].geometry.coordinates;
        expect(coords).toContainEqual([-73.001, 45.001]);
        expect(coords).toContainEqual([-73.002, 45.002]);
        expect(coords).toContainEqual([-73.003, 45.003]);
    });

    it('handles a single step with one node', () => {
        const single = [mockIndoorSteps[1]];
        render(<DirectionsLine {...indoorProps(single)} />);
        const coords = mockShapeSource.mock.calls[0][0].shape.features[0].geometry.coordinates;
        expect(coords).toHaveLength(1);
        expect(coords[0]).toEqual([-73.002, 45.002]);
    });
});
