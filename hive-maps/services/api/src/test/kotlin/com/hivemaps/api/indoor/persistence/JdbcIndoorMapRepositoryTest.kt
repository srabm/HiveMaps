package com.hivemaps.api.indoor.persistence

import com.hivemaps.api.indoor.repository.IndoorMapRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@SpringBootTest
@Transactional
class JdbcIndoorMapRepositoryTest(
    @Autowired private val indoorMapRepository: IndoorMapRepository,
    @Autowired private val jdbcTemplate: JdbcTemplate
) {
    @Test
    fun `findFloorDetails includes seeded bathroom room_type in GeoJSON properties type`() {
        val roomId = "H-9-BATHROOM-TEST-${UUID.randomUUID()}"
        seedTestBathroom(roomId)

        val floorDetails = indoorMapRepository.findFloorDetails(campusId = "SGW", buildingCode = "H", floorId = "9")
        assertNotNull(floorDetails)

        val roomFeature = extractFeatureById(floorDetails.toGeoJson(), roomId)
        assertNotNull(roomFeature)

        val properties = roomFeature["properties"] as Map<*, *>
        assertEquals("bathroom", properties["type"])
    }

    @Test
    fun `findFloorDetails includes canonical unisex bathroom type from H seed`() {
        val floorDetails = indoorMapRepository.findFloorDetails(campusId = "SGW", buildingCode = "H", floorId = "8")
        assertNotNull(floorDetails)

        val types = extractFeatureTypes(floorDetails.toGeoJson())
        assertTrue("bathroom_unisex_acc" in types)
    }

    @Test
    fun `findFloorDetails includes expected H poi types in GeoJSON output`() {
        val floorDetails = listOf("1", "2", "8", "9")
            .mapNotNull { floorId -> indoorMapRepository.findFloorDetails("SGW", "H", floorId) }

        assertEquals(4, floorDetails.size)

        val poiTypes = floorDetails
            .flatMap { detail -> extractFeatureTypes(detail.toGeoJson()) }
            .toSet()

        val expectedPoiTypes = setOf(
            "bathroom_men_acc",
            "bathroom_private_acc",
            "bathroom_unisex_acc",
            "bathroom_women_acc",
            "elevator",
            "escalator",
            "printer",
            "ramp",
            "stairs",
            "water_fountain"
        )

        assertTrue(expectedPoiTypes.all { it in poiTypes })
    }

    private fun seedTestBathroom(roomId: String) {
        jdbcTemplate.update(
            """
            INSERT INTO room (id, building_code, floor_id, label, room_type, geometry)
            VALUES (?, 'H', '9', 'Bathroom Test', 'bathroom',
                    '{"type":"Polygon","coordinates":[[[-73.5792,45.4972],[-73.5792,45.49721],[-73.57919,45.49721],[-73.57919,45.4972],[-73.5792,45.4972]]]}'
                    ::jsonb)
            """.trimIndent(),
            roomId
        )
    }

    private fun extractFeatureById(geoJson: Map<String, Any?>, roomId: String): Map<*, *>? {
        return extractFeatures(geoJson).firstOrNull { feature ->
            val properties = feature["properties"] as? Map<*, *> ?: return@firstOrNull false
            properties["id"] == roomId
        }
    }

    private fun extractFeatureTypes(geoJson: Map<String, Any?>): List<String> {
        return extractFeatures(geoJson).mapNotNull { feature ->
            val properties = feature["properties"] as? Map<*, *> ?: return@mapNotNull null
            properties["type"] as? String
        }
    }

    private fun extractFeatures(geoJson: Map<String, Any?>): List<Map<*, *>> {
        val rooms = geoJson["rooms"] as? Map<*, *> ?: return emptyList()
        val features = rooms["features"] as? List<*> ?: return emptyList()
        return features.filterIsInstance<Map<*, *>>()
    }
}
