package com.hivemaps.api.indoor

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/campuses/{campusId}/buildings/{buildingCode}/floors")
class IndoorMapController(
    private val jdbcTemplate: JdbcTemplate
) {

    private val objectMapper = ObjectMapper()

    @GetMapping
    fun getFloors(
        @PathVariable campusId: String,
        @PathVariable buildingCode: String
    ): List<Map<String, Any?>> {
        val sql = "SELECT id, label, sort_order FROM building_floor WHERE building_code = ? ORDER BY sort_order ASC"
        
        return jdbcTemplate.queryForList(sql, buildingCode).map { row ->
            mapOf(
                "id" to row["id"],
                "label" to row["label"],
                "sortOrder" to row["sort_order"]
            )
        }
    }

    @GetMapping("/{floorId}")
    fun getFloorDetails(
        @PathVariable campusId: String,
        @PathVariable buildingCode: String,
        @PathVariable floorId: String
    ): Map<String, Any?> {
        
        val floorSql = "SELECT label, plan_geometry FROM building_floor WHERE building_code = ? AND id = ?"
        val floorRow = jdbcTemplate.queryForList(floorSql, buildingCode, floorId).firstOrNull() 
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found")

        val roomsSql = "SELECT id, label, room_type, geometry FROM room WHERE building_code = ? AND floor_id = ?"
        val roomRows = jdbcTemplate.queryForList(roomsSql, buildingCode, floorId)

        val features = roomRows.map { room ->
            mapOf(
                "type" to "Feature",
                "geometry" to objectMapper.readValue(room["geometry"].toString(), Map::class.java),
                "properties" to mapOf(
                    "id" to room["id"],
                    "label" to room["label"],
                    "type" to room["room_type"]
                )
            )
        }

        val featureCollection = mapOf(
            "type" to "FeatureCollection",
            "features" to features
        )

        return mapOf(
            "buildingCode" to buildingCode,
            "floor" to mapOf(
                "id" to floorId,
                "label" to floorRow["label"]
            ),
            "planGeometry" to objectMapper.readValue(floorRow["plan_geometry"].toString(), Map::class.java),
            "rooms" to featureCollection
        )
    }
}