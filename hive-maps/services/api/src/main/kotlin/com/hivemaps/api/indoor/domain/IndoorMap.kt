package com.hivemaps.api.indoor.domain

data class FloorSummary(
    val id: String,
    val label: String,
    val sortOrder: Int
)

data class SupportedIndoorBuilding(
    val campusId: String,
    val buildingCode: String,
)

data class RoomFeature(
    val id: String,
    val label: String?,
    val type: String,
    val geometry: Any?
)

data class FloorDetails(
    val buildingCode: String,
    val floorId: String,
    val floorLabel: String,
    val planGeometry: Any?,
    val rooms: List<RoomFeature>
) {
    fun toGeoJson(): Map<String, Any?> {
        val features = rooms.map { room ->
            mapOf(
                "type" to "Feature",
                "geometry" to room.geometry,
                "properties" to mapOf(
                    "id" to room.id,
                    "label" to room.label,
                    "type" to room.type
                )
            )
        }

        return mapOf(
            "buildingCode" to buildingCode,
            "floor" to mapOf(
                "id" to floorId,
                "label" to floorLabel
            ),
            "planGeometry" to planGeometry,
            "rooms" to mapOf(
                "type" to "FeatureCollection",
                "features" to features
            )
        )
    }
}
