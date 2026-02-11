package com.hivemaps.api.campus.domain
import com.hivemaps.api.campus.persistence.BuildingEntity

object BuildingShape {
    fun toGeoJsonFeature(building: BuildingEntity): Map<String, Any>? {
        val location = building.location ?: return null
        val type = location["type"] as? String ?: return null
        if (type != "Polygon") return null
        if (!location.containsKey("coordinates")) return null
        val coordsAny = location["coordinates"] ?: return null
        val coords = coordsAny as? List<*> ?: return null
        if (coords.isEmpty()) return null
        val first = coords[0]
        if (first !is List<*>) return null

        return mapOf(
            "type" to "Feature",
            "geometry" to mapOf(
                "type" to type,
                "coordinates" to coords
            ),
            "properties" to mapOf(
                "id" to building.code,
                "name" to building.name
            )
        )
    }

    fun toGeoJsonFeatureCollection(buildings: List<BuildingEntity>): Map<String, Any> {
        val features = buildings.mapNotNull { toGeoJsonFeature(it) }
        return mapOf(
            "type" to "FeatureCollection",
            "features" to features
        )
    }
}