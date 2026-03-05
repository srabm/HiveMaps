import {fetchNearestNode} from '@/services/http/indoor-api';

/**
 * Integration tests for indoor-api that call the real backend.
 * These tests require a running backend server.
 *
 * TO RUN THIS TEST: npm run test:integration
 */

describe('indoor-api integration tests (real backend)', () => {
    // Skip these tests if backend is not available
    const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8080';

    beforeAll(() => {
        console.log(`\n🔌 Running integration tests against backend: ${backendUrl}\n`);
    });

    it('fetchNearestNode returns a real node from Hall 8th floor', async () => {
        // Hall building, 8th floor, coordinates for room H8.807
        const longitude = -73.5786668211;
        const latitude = 45.4971647934;

        const result = await fetchNearestNode('H', '8', longitude, latitude);

        // Verify the response matches the expected node
        expect(result).toBeDefined();
        expect(result.id).toBe('H8.807');
        expect(result.label).toBe('Room');
        expect(result.building).toBe('H');
        expect(result.floor).toBe('8');
        expect(result.longitude).toBeCloseTo(longitude, 5);
        expect(result.latitude).toBeCloseTo(latitude, 5);
        expect(result.wheelchairAccessible).toBe(true);

        console.log(`✓ Found nearest node: ${result.id} (${result.label})`);
    });

    it('fetchNearestNode returns a junction node from Library Building floor 2', async () => {
        // Library (LB) building, floor 2, coordinates for junction LB2_J1
        const longitude = -73.5784649848;
        const latitude = 45.496643494;

        const result = await fetchNearestNode('LB', '2', longitude, latitude);

        expect(result).toBeDefined();
        expect(result.id).toBe('LB2_J1');
        expect(result.label).toBe('Junction');
        expect(result.building).toBe('LB');
        expect(result.floor).toBe('2');
        expect(result.longitude).toBeCloseTo(longitude, 5);
        expect(result.latitude).toBeCloseTo(latitude, 5);

        console.log(`✓ Found nearest junction node: ${result.id} (${result.label})`);
    });

    it('fetchNearestNode throws error when no nodes within 20m', async () => {
        // Invalid coordinates
        const longitude = 0.0;
        const latitude = 0.0;

        await expect(fetchNearestNode('H', '8', longitude, latitude)).rejects.toThrow(
            /No nodes found/,
        );

        console.log('✓ Correctly threw error for invalid coordinates');
    });

    it('fetchNearestNode throws error for non-existent building', async () => {
        const longitude = -73.57866682112217;
        const latitude = 45.49716479345519;

        await expect(fetchNearestNode('INVALID', '8', longitude, latitude)).rejects.toThrow();

        console.log('✓ Correctly threw error for invalid building');
    });

    it('fetchNearestNode throws error for non-existent floor', async () => {
        const longitude = -73.57866682112217;
        const latitude = 45.49716479345519;

        await expect(fetchNearestNode('H', '999', longitude, latitude)).rejects.toThrow();

        console.log('✓ Correctly threw error for invalid floor');
    });
});
