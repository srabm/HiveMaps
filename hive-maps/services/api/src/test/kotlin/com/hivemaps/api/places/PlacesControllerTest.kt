package com.hivemaps.api.places

import org.junit.jupiter.api.Test
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withServerError
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestTemplate
import org.springframework.web.server.ResponseStatusException
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class PlacesControllerTest {

    @Test
    fun `search prefers establishment place when present`() {
        val restTemplate = RestTemplate()
        val server = MockRestServiceServer.bindTo(restTemplate).build()
        val controller = PlacesController("dummy-key", restTemplate)

        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("X-Goog-Api-Key", "dummy-key"))
            .andExpect(jsonPath("$.textQuery").value("1455 De Maisonneuve establishment"))
            .andRespond(
                withSuccess(
                    """
                    {
                      "places": [
                        { "id": "p1", "types": ["school"] },
                        { "id": "p2", "types": ["establishment", "point_of_interest"] }
                      ]
                    }
                    """.trimIndent(),
                    MediaType.APPLICATION_JSON
                )
            )

        val result = controller.search(PlaceSearchRequest("1455 De Maisonneuve"))

        assertEquals("p2", result["placeId"])
        server.verify()
    }

    @Test
    fun `search falls back to first place when no establishment is present`() {
        val restTemplate = RestTemplate()
        val server = MockRestServiceServer.bindTo(restTemplate).build()
        val controller = PlacesController("dummy-key", restTemplate)

        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(
                withSuccess(
                    """
                    {
                      "places": [
                        { "id": "p1", "types": ["school"] },
                        { "id": "p2", "types": ["university"] }
                      ]
                    }
                    """.trimIndent(),
                    MediaType.APPLICATION_JSON
                )
            )

        val result = controller.search(PlaceSearchRequest("some address"))

        assertEquals("p1", result["placeId"])
        server.verify()
    }

    @Test
    fun `details returns parsed body on successful upstream response`() {
        val restTemplate = RestTemplate()
        val server = MockRestServiceServer.bindTo(restTemplate).build()
        val controller = PlacesController("dummy-key", restTemplate)
        val placeId = "abc123"

        server.expect(requestTo("https://places.googleapis.com/v1/places/$placeId"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header("X-Goog-Api-Key", "dummy-key"))
            .andRespond(
                withSuccess(
                    """
                    {
                      "formattedAddress": "1455 De Maisonneuve Blvd W, Montreal, QC H3G 1M8"
                    }
                    """.trimIndent(),
                    MediaType.APPLICATION_JSON
                )
            )

        val result = controller.details(placeId)

        assertTrue(result is Map<*, *>)
        assertEquals(
            "1455 De Maisonneuve Blvd W, Montreal, QC H3G 1M8",
            (result as Map<*, *>)["formattedAddress"]
        )
        server.verify()
    }

    @Test
    fun `details returns empty map when upstream request fails`() {
        val restTemplate = RestTemplate()
        val server = MockRestServiceServer.bindTo(restTemplate).build()
        val controller = PlacesController("dummy-key", restTemplate)
        val placeId = "abc123"

        server.expect(requestTo("https://places.googleapis.com/v1/places/$placeId"))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withServerError())

        val result = controller.details(placeId)

        assertTrue(result is Map<*, *>)
        assertTrue((result as Map<*, *>).isEmpty())
        server.verify()
    }

    @Test
    fun `details rejects invalid placeId format`() {
        val controller = PlacesController("dummy-key", RestTemplate())

        assertFailsWith<ResponseStatusException> {
            controller.details("../etc/passwd")
        }
    }
}
