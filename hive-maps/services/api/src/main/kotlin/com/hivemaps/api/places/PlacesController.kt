package com.hivemaps.api.places

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder

@RestController
@RequestMapping("/api/places")
class PlacesController(
    @Value("\${google.places.api-key}") private val apiKey: String,
    private val restTemplate: RestTemplate = RestTemplate()
) {
    private val validPlaceId = Regex("^[A-Za-z0-9_-]{1,256}$")

    @PostMapping("/search")
    fun search(@RequestBody req: PlaceSearchRequest): Map<String, String?> {
        val url = "https://places.googleapis.com/v1/places:searchText"

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set("X-Goog-Api-Key", apiKey)
            set("X-Goog-FieldMask", "places.id,places.types,places.displayName")
        }

        val optimizedQuery = "${req.address} establishment"
        val body = mapOf("textQuery" to optimizedQuery)
        
        val entity = HttpEntity(body, headers)
        val response = restTemplate.exchange(url, HttpMethod.POST, entity, Map::class.java)

        val places = response.body?.get("places") as? List<Map<String, Any>>
        
        val bestPlace = places?.firstOrNull { place ->
            val types = place["types"] as? List<String>
            types?.contains("establishment") == true
        } ?: places?.firstOrNull()

        return mapOf("placeId" to bestPlace?.get("id") as? String)
    }

    @GetMapping("/{placeId}")
    fun details(@PathVariable placeId: String): Any {
        val url = buildDetailsUrl(placeId)

        val headers = HttpHeaders().apply {
            set("X-Goog-Api-Key", apiKey)
            set(
                "X-Goog-FieldMask",
                "formattedAddress,postalAddress,websiteUri,businessStatus,accessibilityOptions,websiteUri,regularOpeningHours,currentOpeningHours,nationalPhoneNumber,internationalPhoneNumber"
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

    private fun buildDetailsUrl(placeId: String): String {
        if (!validPlaceId.matches(placeId)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid placeId format")
        }

        return UriComponentsBuilder
            .fromUriString("https://places.googleapis.com")
            .pathSegment("v1", "places", placeId)
            .build()
            .toUriString()
    }
}

data class PlaceSearchRequest(
    val address: String
)
