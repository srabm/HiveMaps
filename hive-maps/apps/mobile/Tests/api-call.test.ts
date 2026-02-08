import {
    DirectionsRequest,
    DirectionsResponse,
    Provider,
    TransportMode,
    getDirections
} from '@/services/maps/directions-api-adapter'
import dotenv from 'dotenv';

dotenv.config()

async function testDirectionsAPI() {
    const testRequest: DirectionsRequest = {
        origin: {latitude: 45.4972, longitude: -73.5787},
        destination: {latitude: 45.4942, longitude: -73.5784},
        transportMode: TransportMode.WALKING,
        provider: Provider.GOOGLE_MAPS
    };

    try {
        const response = await getDirections(testRequest);
        console.log('Directions Response:', response);
        return response;
    } catch (error) {
        console.error('Error fetching directions:', error);
        throw error;
    }
}

// Call the test function
testDirectionsAPI();