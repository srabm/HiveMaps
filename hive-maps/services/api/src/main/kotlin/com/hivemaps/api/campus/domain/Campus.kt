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
    val location: Map<String, Any>? = null,
    val center: Coordinate
)

data class Coordinate(
    val lon: Double,
    val lat: Double
)
