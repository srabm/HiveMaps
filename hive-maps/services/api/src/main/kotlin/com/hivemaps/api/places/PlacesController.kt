package com.hivemaps.api.places

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.*
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestTemplate

@RestController
@RequestMapping("/api/places")
class PlacesController(
    @Value("\${google.places.api-key}") private val apiKey: String
) {

    private val restTemplate = RestTemplate()

    @PostMapping("/search")
    fun search(@RequestBody req: PlaceSearchRequest): Map<String, String?> {
        val url = "https://places.googleapis.com/v1/places:searchText"

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set("X-Goog-Api-Key", apiKey)
            set("X-Goog-FieldMask", "places.id")
        }

        val body = mapOf("textQuery" to req.address)
        val entity = HttpEntity(body, headers)

        val response = restTemplate.exchange(
            url,
            HttpMethod.POST,
            entity,
            Map::class.java
        )

        val places = response.body?.get("places") as? List<Map<String, Any>>
        val placeId = places?.firstOrNull()?.get("id") as? String

        return mapOf("placeId" to placeId)
    }

    @GetMapping("/{placeId}")
    fun details(@PathVariable placeId: String): Any {
        val url = "https://places.googleapis.com/v1/places/$placeId"

        val headers = HttpHeaders().apply {
            set("X-Goog-Api-Key", apiKey)
            set(
                "X-Goog-FieldMask",
                "regularOpeningHours,currentOpeningHours,nationalPhoneNumber,internationalPhoneNumber"
            )
        }

        val entity = HttpEntity<Void>(headers)

        return try {
            val response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                Map::class.java
            )
            
            response.body ?: emptyMap<String, Any>()
        } catch (e: Exception) {
            println("Error fetching place details: ${e.message}")
            emptyMap<String, Any>()
        }
    }
}

data class PlaceSearchRequest(
    val address: String
)