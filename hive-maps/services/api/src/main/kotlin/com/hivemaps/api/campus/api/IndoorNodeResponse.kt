package com.hivemaps.api.campus.api

data class IndoorNodeResponse(
    val id: String,
    val label: String,
    val wheelchairAccessible: Boolean,
    val floor: String,
    val building: String,
    val longitude: Double,
    val latitude: Double
)