package com.hivemaps.api.indoor.persistence

import com.fasterxml.jackson.databind.ObjectMapper
import com.hivemaps.api.indoor.domain.FloorDetails
import com.hivemaps.api.indoor.domain.FloorSummary
import com.hivemaps.api.indoor.domain.RoomFeature
import com.hivemaps.api.indoor.domain.SupportedIndoorBuilding
import com.hivemaps.api.indoor.repository.IndoorMapRepository
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.nio.charset.StandardCharsets

@Repository
class JdbcIndoorMapRepository(
    private val jdbcTemplate: JdbcTemplate
) : IndoorMapRepository {

    private val objectMapper = ObjectMapper()

    override fun findSupportedBuildings(): List<SupportedIndoorBuilding> {
        val sql = """
            SELECT DISTINCT b.campus_id, bf.building_code
            FROM building_floor bf
            JOIN building b ON b.code = bf.building_code
            ORDER BY b.campus_id ASC, bf.building_code ASC
        """.trimIndent()

        return jdbcTemplate.query(sql, { rs, _ ->
            SupportedIndoorBuilding(
                campusId = rs.getString("campus_id"),
                buildingCode = rs.getString("building_code"),
            )
        })
    }

    override fun findFloorsByCampusAndBuilding(campusId: String, buildingCode: String): List<FloorSummary> {
        val sql = """
            SELECT bf.id, bf.label, bf.sort_order
            FROM building_floor bf
            JOIN building b ON b.code = bf.building_code
            WHERE b.campus_id = ? AND bf.building_code = ?
            ORDER BY bf.sort_order ASC
        """.trimIndent()

        return jdbcTemplate.query(sql, { rs, _ ->
            FloorSummary(
                id = rs.getString("id"),
                label = rs.getString("label"),
                sortOrder = rs.getInt("sort_order")
            )
        }, campusId, buildingCode)
    }

    override fun findFloorDetails(campusId: String, buildingCode: String, floorId: String): FloorDetails? {
        val floorSql = """
            SELECT bf.label, bf.plan_geometry
            FROM building_floor bf
            JOIN building b ON b.code = bf.building_code
            WHERE b.campus_id = ? AND bf.building_code = ? AND bf.id = ?
        """.trimIndent()

        val floorRow = jdbcTemplate.queryForList(floorSql, campusId, buildingCode, floorId).firstOrNull()
            ?: return null

        val roomsSql = "SELECT id, label, room_type, geometry,nodeID FROM room WHERE building_code = ? AND floor_id = ?"
        val roomRows = jdbcTemplate.queryForList(roomsSql, buildingCode, floorId)

        val rooms = roomRows.map { room ->
            RoomFeature(
                id = room["id"] as String,
                label = room["label"] as String?,
                type = room["room_type"] as String,
                geometry = parseJsonColumn(room["geometry"]),
                nodeID = room["nodeID"] as String?
            )
        }

        return FloorDetails(
            buildingCode = buildingCode,
            floorId = floorId,
            floorLabel = floorRow["label"] as String,
            planGeometry = parseJsonColumn(floorRow["plan_geometry"]),
            rooms = rooms
        )
    }

    private fun parseJsonColumn(value: Any?): Any? {
        if (value == null) return null
        val raw = when (value) {
            is ByteArray -> String(value, StandardCharsets.UTF_8)
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
