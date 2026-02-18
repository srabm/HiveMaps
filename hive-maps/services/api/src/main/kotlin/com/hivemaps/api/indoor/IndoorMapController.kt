package com.hivemaps.api.indoor

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.*
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/campuses/{campusId}/buildings/{buildingCode}/floors")
class IndoorMapController(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper
) {

    private fun ensureBuildingInCampus(campusId: String, buildingCode: String) {
        val existsSql = "SELECT COUNT(1) FROM building WHERE campus_id = ? AND code = ?"
        val exists = jdbcTemplate.queryForObject(existsSql, Int::class.java, campusId, buildingCode) ?: 0
        if (exists == 0) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found for campus")
        }
    }

    @GetMapping
    fun getFloors(
        @PathVariable campusId: String, 
        @PathVariable buildingCode: String
    ): List<Map<String, Any>> {
        val normalizedCampusId = campusId.uppercase()
        val normalizedBuildingCode = buildingCode.uppercase()
        ensureBuildingInCampus(normalizedCampusId, normalizedBuildingCode)

        val sql = "SELECT id, label, sort_order FROM building_floor WHERE building_code = ? ORDER BY sort_order ASC"
        
        return jdbcTemplate.queryForList(sql, normalizedBuildingCode).map { row ->
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
    ): Map<String, Any> {
        val normalizedCampusId = campusId.uppercase()
        val normalizedBuildingCode = buildingCode.uppercase()
        val normalizedFloorId = floorId.uppercase()

        ensureBuildingInCampus(normalizedCampusId, normalizedBuildingCode)

        val floorSql = "SELECT label, plan_geometry FROM building_floor WHERE building_code = ? AND id = ?"
        val floorRow = jdbcTemplate.queryForList(floorSql, normalizedBuildingCode, normalizedFloorId).firstOrNull() 
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found")

        val roomsSql = """
            SELECT id, COALESCE(label, id) AS label, COALESCE(room_type, 'room') AS room_type, geometry
            FROM room
            WHERE building_code = ? AND floor_id = ?
            ORDER BY id
        """.trimIndent()
        val roomRows = jdbcTemplate.queryForList(roomsSql, normalizedBuildingCode, normalizedFloorId)

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
            "buildingCode" to normalizedBuildingCode,
            "floor" to mapOf(
                "id" to normalizedFloorId,
                "label" to floorRow["label"]
            ),
            "planGeometry" to objectMapper.readValue(floorRow["plan_geometry"].toString(), Map::class.java),
            "rooms" to featureCollection
        )
    }
}
