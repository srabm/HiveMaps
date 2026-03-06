package com.hivemaps.api.campus.api

import com.hivemaps.api.campus.service.IndoorDirectionsService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestParam

@RestController
@RequestMapping("/api/indoor-directions")
class IndoorDirectionsController(
    private val indoorDirectionsService: IndoorDirectionsService
) {

    @GetMapping("/building/{building}/from/{startNodeId}/to/{endNodeId}")
    fun getIndoorDirections(
        @PathVariable building: String,
        @PathVariable startNodeId: String,
        @PathVariable endNodeId: String,
        @RequestParam(defaultValue = "false") accessible: Boolean
    ): ResponseEntity<Any> {
        val directions = indoorDirectionsService.getDirections(building, startNodeId, endNodeId, accessible).map { it.toResponse() }
        return ResponseEntity.ok(directions)
    }

    @GetMapping("/building/{building}/rooms")
    fun getIndoorRooms(
        @PathVariable building: String,
        @RequestParam floor: String?
    ): ResponseEntity<Any> {
        val rooms = indoorDirectionsService.getRooms(building, floor).map { it.toResponse() }
        return ResponseEntity.ok(rooms)
    }

    @GetMapping("/building/{building}/floor/{floor}/nearest-node")
    fun getNearestNode(
        @PathVariable building: String,
        @PathVariable floor: String,
        @RequestParam longitude: Double,
        @RequestParam latitude: Double
    ): ResponseEntity<Any> {
        val nearestNode = indoorDirectionsService.getNearestNode(building, floor, longitude, latitude).toResponse()
        return ResponseEntity.ok(nearestNode)
    }
}
