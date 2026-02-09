package com.hivemaps.api.campus.domain
import com.hivemaps.api.campus.persistence.BuildingEntity
import com.hivemaps.api.campus.persistence.CampusEntity
import com.hivemaps.api.campus.domain.CampusId
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class BuildingShapeTest {

    private fun campusEntity(id: CampusId): CampusEntity {
        return CampusEntity(
            id, id.name, id.name, 0.0, 0.0, 0.0
        )
    }

    private fun building(code: String, campusId: CampusId, location: Map<String, Any>? = null): BuildingEntity {
        return BuildingEntity(
            code, campusEntity(campusId), code, location
        )
    }
    private fun polygonLocation(coordinates: List<List<List<Double>>>): Map<String, Any> {
        return mapOf(
            "type" to "Polygon",
            "coordinates" to coordinates
        )
    }

    @Test
    fun `toGeoJsonFeature returns null for building that is not Polygon`(){
        val loc = mapOf(
            "type" to "Point",
            "coordinates" to listOf(-73.0, 45.0)
        )
        val b = building("H", CampusId.SGW, location = loc)
        val feature = BuildingShape.toGeoJsonFeature(b)
        assertEquals(null, feature)
    }
    @Test
    fun `toGeoJsonFeature returns null for building with no coordinates`(){
        val loc = mapOf(
            "type" to "Polygon"
        )
        val b = building("H", CampusId.SGW, location = loc)
        val feature = BuildingShape.toGeoJsonFeature(b)
        assertEquals(null, feature)
    }
    @Test
    fun `toGeoJsonFeature returns correct GeoJSON feature for valid building`(){
        val coords = listOf(
            listOf(
                listOf(-73.0, 45.0),
                listOf(-73.1, 45.0),
                listOf(-73.1, 45.1),
                listOf(-73.0, 45.1),
                listOf(-73.0, 45.0)
            )
        )
        val loc = polygonLocation(coords)
        val b = building("H", CampusId.SGW, location = loc)
        val feature = BuildingShape.toGeoJsonFeature(b)
        val expected = mapOf(
            "type" to "Feature",
            "geometry" to mapOf(
                "type" to "Polygon",
                "coordinates" to coords
            ),
            "properties" to mapOf(
                "id" to "H",
                "name" to "H"
            )
        )
        assertEquals(expected, feature)
    }
    @Test
    fun `toGeoJsonFeatureCollection returns correct GeoJSON FeatureCollection`(){
        val coords1 = listOf(
            listOf(
                listOf(-73.0, 45.0),
                listOf(-73.1, 45.0),
                listOf(-73.1, 45.1),
                listOf(-73.0, 45.1),
                listOf(-73.0, 45.0)
            )
        )
        val loc1 = polygonLocation(coords1)
        val b1 = building("H", CampusId.SGW, location = loc1)

        val coords2 = listOf(
            listOf(
                listOf(-73.2, 45.2),
                listOf(-73.3, 45.2),
                listOf(-73.3, 45.3),
                listOf(-73.2, 45.3),
                listOf(-73.2, 45.2)
            )
        )
        val loc2 = polygonLocation(coords2)
        val b2 = building("G", CampusId.SGW, location = loc2)

        val collection = BuildingShape.toGeoJsonFeatureCollection(listOf(b1, b2))
        val expected = mapOf(
            "type" to "FeatureCollection",
            "features" to listOf(
                mapOf(
                    "type" to "Feature",
                    "geometry" to mapOf(
                        "type" to "Polygon",
                        "coordinates" to coords1
                    ),
                    "properties" to mapOf(
                        "id" to "H",
                        "name" to "H"
                    )
                ),
                mapOf(
                    "type" to "Feature",
                    "geometry" to mapOf(
                        "type" to "Polygon",
                        "coordinates" to coords2
                    ),
                    "properties" to mapOf(
                        "id" to "G",
                        "name" to "G"
                    )
                )
            )
        )
        assertEquals(expected, collection)
    }
    @Test
    fun `toGeoJsonFeatureCollection skips invalid buildings`(){
        val coords1 = listOf(
            listOf(
                listOf(-73.0, 45.0),
                listOf(-73.1, 45.0),
                listOf(-73.1, 45.1),
                listOf(-73.0, 45.1),
                listOf(-73.0, 45.0)
            )
        )
        val loc1 = polygonLocation(coords1)
        val b1 = building("H", CampusId.SGW, location = loc1)

        val loc2 = mapOf(
            "type" to "Point",
            "coordinates" to listOf(-73.2, 45.2)
        )
        val b2 = building("G", CampusId.SGW, location = loc2)

        val collection = BuildingShape.toGeoJsonFeatureCollection(listOf(b1, b2))
        val expected = mapOf(
            "type" to "FeatureCollection",
            "features" to listOf(
                mapOf(
                    "type" to "Feature",
                    "geometry" to mapOf(
                        "type" to "Polygon",
                        "coordinates" to coords1
                    ),
                    "properties" to mapOf(
                        "id" to "H",
                        "name" to "H"
                    )
                )
            )
        )
        assertEquals(expected, collection)
    }
    @Test
    fun `toGeoJsonFeatureCollection returns empty features for no valid buildings`(){
        val loc1 = mapOf(
            "type" to "Point",
            "coordinates" to listOf(-73.0, 45.0)
        )
        val b1 = building("H", CampusId.SGW, location = loc1)

        val loc2 = mapOf(
            "type" to "LineString",
            "coordinates" to listOf(
                listOf(-73.2, 45.2),
                listOf(-73.3, 45.3)
            )
        )
        val b2 = building("G", CampusId.SGW, location = loc2)

        val collection = BuildingShape.toGeoJsonFeatureCollection(listOf(b1, b2))
        val expected = mapOf(
            "type" to "FeatureCollection",
            "features" to listOf<Any>()
        )
        assertEquals(expected, collection)
    }

    @Test
    fun `toGeoJsonFeature returns null when location is null`() {
        val b = building("X", CampusId.SGW)
        val feature = BuildingShape.toGeoJsonFeature(b)
        assertEquals(null, feature)
    }

    @Test
    fun `toGeoJsonFeature returns null when coordinates wrong type`() {
        val loc = mapOf(
            "type" to "Polygon",
            "coordinates" to listOf(-73.0, 45.0)
        )
        val b = building("X", CampusId.SGW, location = loc)
        val feature = BuildingShape.toGeoJsonFeature(b)
        assertEquals(null, feature)
    }

    @Test
    fun `toGeoJsonFeature preserves distinct code and name in properties`() {
        val coords = listOf(
            listOf(
                listOf(-73.0, 45.0),
                listOf(-73.1, 45.0),
                listOf(-73.1, 45.1),
                listOf(-73.0, 45.1),
                listOf(-73.0, 45.0)
            )
        )
        val loc = polygonLocation(coords)
        val b = BuildingEntity("H1", campusEntity(CampusId.SGW), "Hall H1", loc)
        val feature = BuildingShape.toGeoJsonFeature(b)
        val expected = mapOf(
            "type" to "Feature",
            "geometry" to mapOf(
                "type" to "Polygon",
                "coordinates" to coords
            ),
            "properties" to mapOf(
                "id" to "H1",
                "name" to "Hall H1"
            )
        )
        assertEquals(expected, feature)
    }
}
