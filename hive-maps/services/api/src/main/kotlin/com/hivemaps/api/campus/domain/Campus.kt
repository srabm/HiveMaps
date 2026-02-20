package com.hivemaps.api.campus.domain

data class Campus(
    val id: CampusId,
    val label: String,
    val name: String,
    val center: Coordinate,
    val zoom: Double
)

data class Building(
    val campus: CampusId,
    val code: String,
    val name: String,
    val addresses: List<String>,
    val location: Map<String, Any>? = null
)

data class Coordinate(
    val lon: Double,
    val lat: Double
)

data class IndoorNode(
    val id: String,
    val label: String,
    val wheelchairAccessible: Boolean,
    val floor: String,
    val building: String,
    val longitude: Double,
    val latitude: Double,
    val outgoingEdges: MutableList<IndoorEdge>
)

data class IndoorEdge(
    val id: String,
    val label: String,
    val wheelchairAccessible: Boolean,
    val startNode: IndoorNode,
    val endNode: IndoorNode,
    val building: String,
    val distance: Double
)