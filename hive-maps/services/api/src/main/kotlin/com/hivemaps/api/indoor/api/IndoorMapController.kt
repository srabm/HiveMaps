package com.hivemaps.api.indoor.api

import com.hivemaps.api.indoor.service.IndoorMapService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/campuses/{campusId}/buildings/{buildingCode}/floors")
class IndoorMapController(
    private val indoorMapService: IndoorMapService
) {

    @GetMapping
    fun getFloors(
        @PathVariable campusId: String,
        @PathVariable buildingCode: String
    ): List<Map<String, Any?>> {
        val floors = indoorMapService.getBuildingFloors(campusId, buildingCode)
        
        if (floors.isEmpty()) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found for campus")
        }

        return floors.map { floor ->
            mapOf(
                "id" to floor.id,
                "label" to floor.label,
                "sortOrder" to floor.sortOrder
            )
        }
    }

    @GetMapping("/{floorId}")
    fun getFloorDetails(
        @PathVariable campusId: String,
        @PathVariable buildingCode: String,
        @PathVariable floorId: String
    ): Map<String, Any?> {
        val floorDetails = indoorMapService.getFloorDetails(campusId, buildingCode, floorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found")

        return floorDetails.toGeoJson()
    }
}