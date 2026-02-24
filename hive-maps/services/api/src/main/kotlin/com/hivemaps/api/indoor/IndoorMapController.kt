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
        val sql = """
            SELECT bf.id, bf.label, bf.sort_order
            FROM building_floor bf
            JOIN building b ON b.code = bf.building_code
            WHERE b.campus_id = ? AND bf.building_code = ?
            ORDER BY bf.sort_order ASC
        """.trimIndent()

        val rows = jdbcTemplate.queryForList(sql, campusId, buildingCode)
        if (rows.isEmpty()) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Building not found for campus")
        }

        return rows.map { row ->
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

        val floorSql = """
            SELECT bf.label, bf.plan_geometry
            FROM building_floor bf
            JOIN building b ON b.code = bf.building_code
            WHERE b.campus_id = ? AND bf.building_code = ? AND bf.id = ?
        """.trimIndent()
        val floorRow = jdbcTemplate.queryForList(floorSql, campusId, buildingCode, floorId).firstOrNull()
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Floor not found")

        val roomsSql = "SELECT id, label, room_type, geometry FROM room WHERE building_code = ? AND floor_id = ?"
        val roomRows = jdbcTemplate.queryForList(roomsSql, buildingCode, floorId)

        val features = roomRows.map { room ->
            mapOf(
                "type" to "Feature",
                "geometry" to parseJsonColumn(room["geometry"]),
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
            "planGeometry" to parseJsonColumn(floorRow["plan_geometry"]),
            "rooms" to featureCollection
        )
    }

    private fun parseJsonColumn(value: Any?): Any? {
        if (value == null) return null
        val raw = when (value) {
            is ByteArray -> value.toString(Charsets.UTF_8)
            else -> value.toString()
        }
        val parsed: Any? = objectMapper.readValue(raw, Any::class.java)
        return if (parsed is String && (parsed.trim().startsWith("{") || parsed.trim().startsWith("["))) {
            objectMapper.readValue(parsed, Any::class.java)
        } else {
            parsed
        }
    }
}
